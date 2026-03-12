import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";
import { logActivity } from "@/lib/activity";

// POST /api/projects/:id/copy — duplicate a project
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

        // Only OWNER or MANAGER can copy
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

        const { title } = await request.json();
        if (!title || typeof title !== "string" || title.trim().length === 0) {
            return NextResponse.json(
                { error: "Title is required for the new project" },
                { status: 400 }
            );
        }

        // Get original project with deadlines
        const original = await db.project.findUnique({
            where: { id: projectId },
            include: {
                deadlines: {
                    include: { assignees: true },
                },
            },
        });

        if (!original) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Create new project
        const newProject = await db.project.create({
            data: {
                owner_id: session.userId,
                title: title.trim(),
                description: original.description,
                start_date: original.start_date,
                end_date: original.end_date,
                members: {
                    create: {
                        user_id: session.userId,
                        role_in_project: "OWNER",
                    },
                },
                deadlines: {
                    create: original.deadlines.map((dl) => ({
                        setter_id: session.userId,
                        title: dl.title,
                        description: dl.description,
                        deadline_date: dl.deadline_date,
                        status: "TODO",
                        priority: dl.priority,
                        completion: 0,
                        target: dl.target,
                        result_links: dl.result_links,
                        output: dl.output,
                    })),
                },
            },
            include: {
                owner: {
                    select: { id: true, fullname: true, username: true },
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, fullname: true, username: true },
                        },
                    },
                },
                deadlines: true,
                _count: { select: { deadlines: true, members: true } },
            },
        });

        await logActivity(projectId, session.userId, "PROJECT_COPIED", `Copied project to: ${title.trim()}`);
        await logActivity(newProject.id, session.userId, "PROJECT_CREATED", `Copied from project #${projectId}`);

        return NextResponse.json(
            { message: "Project copied successfully", project: serializeBigInt(newProject) },
            { status: 201 }
        );
    } catch (error) {
        console.error("Copy project error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
