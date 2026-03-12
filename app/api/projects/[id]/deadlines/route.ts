import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";
import { logActivity } from "@/lib/activity";
import { DeadlineStatus, DeadlinePriority } from "@prisma/client";


// GET /api/projects/:id/deadlines
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const projectId = BigInt(id);

        // check membership
        const membership = await db.project_members.findUnique({
            where: {
                project_id_user_id: {
                    project_id: projectId,
                    user_id: session.userId,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const sortBy = searchParams.get("sort_by") || "deadline_date";
        const order = searchParams.get("order") || "asc";

        const where: Record<string, unknown> = { project_id: projectId };
        if (status && Object.values(DeadlineStatus).includes(status as DeadlineStatus)) {
            where.status = status;
        }

        const priority = searchParams.get("priority");
        if (priority && Object.values(DeadlinePriority).includes(priority as DeadlinePriority)) {
            where.priority = priority;
        }

        const deadlines = await db.deadlines.findMany({
            where,
            orderBy: { [sortBy]: order },
            include: {
                setter: {
                    select: { id: true, fullname: true, username: true },
                },
                assignees: {
                    include: {
                        user: {
                            select: { id: true, fullname: true, username: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json(
            { deadlines: serializeBigInt(deadlines) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get deadlines error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}


// POST /api/projects/:id/deadlines
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const projectId = BigInt(id);

        // Only OWNER or MANAGER can create deadlines
        const membership = await db.project_members.findUnique({
            where: {
                project_id_user_id: {
                    project_id: projectId,
                    user_id: session.userId,
                },
            },
        });

        if (!membership || membership.role_in_project === "MEMBER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { title, description, deadline_date, assignee_ids, priority, completion, target, result_links, output } = await request.json();

        if (!title || !deadline_date) {
            return NextResponse.json(
                { error: "Title and deadline_date are required" },
                { status: 400 }
            );
        }

        // Validate priority
        if (priority && !Object.values(DeadlinePriority).includes(priority)) {
            return NextResponse.json(
                { error: "Invalid priority. Must be HIGH, MEDIUM, or LOW" },
                { status: 400 }
            );
        }

        // Validate completion
        if (completion !== undefined && (completion < 0 || completion > 100)) {
            return NextResponse.json(
                { error: "Completion must be between 0 and 100" },
                { status: 400 }
            );
        }

        // Verify all assignees are project members
        if (assignee_ids && assignee_ids.length > 0) {
            const members = await db.project_members.findMany({
                where: {
                    project_id: projectId,
                    user_id: { in: assignee_ids },
                },
            });

            if (members.length !== assignee_ids.length) {
                return NextResponse.json(
                    { error: "Some assignees are not members of this project" },
                    { status: 400 }
                );
            }
        }

        const deadline = await db.deadlines.create({
            data: {
                project_id: projectId,
                setter_id: session.userId,
                title,
                description: description || null,
                deadline_date: new Date(deadline_date),
                priority: priority || "MEDIUM",
                completion: completion ?? 0,
                target: target || null,
                result_links: result_links || null,
                output: output || null,
                assignees:
                    assignee_ids && assignee_ids.length > 0
                        ? {
                              createMany: {
                                  data: assignee_ids.map((userId: string) => ({
                                      user_id: userId,
                                  })),
                              },
                          }
                        : undefined,
            },
            include: {
                setter: {
                    select: { id: true, fullname: true, username: true },
                },
                assignees: {
                    include: {
                        user: {
                            select: { id: true, fullname: true, username: true },
                        },
                    },
                },
            },
        });

        await logActivity(projectId, session.userId, "DEADLINE_CREATED", `Created deadline: ${deadline.title}`);

        return NextResponse.json(
            { message: "Deadline created successfully", deadline: serializeBigInt(deadline) },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create deadline error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}