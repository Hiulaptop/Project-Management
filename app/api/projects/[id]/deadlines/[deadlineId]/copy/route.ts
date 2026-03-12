import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";
import { logActivity } from "@/lib/activity";

// POST /api/projects/:id/deadlines/:deadlineId/copy — duplicate a deadline
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; deadlineId: string }> }
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, deadlineId } = await params;
        const projectId = BigInt(id);
        const dlId = BigInt(deadlineId);

        // Verify membership
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

        // Get original deadline with assignees
        const original = await db.deadlines.findUnique({
            where: { id: dlId, project_id: projectId },
            include: { assignees: true },
        });

        if (!original) {
            return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
        }

        const body = await request.json().catch(() => ({}));
        const title = body?.title?.trim() || `${original.title} (Copy)`;

        // Create the copied deadline
        const newDeadline = await db.deadlines.create({
            data: {
                project_id: projectId,
                setter_id: session.userId,
                title: title,
                description: original.description,
                deadline_date: original.deadline_date,
                status: "TODO",
                priority: original.priority,
                completion: 0,
                target: original.target,
                result_links: original.result_links,
                output: original.output,
                assignees: {
                    create: original.assignees.map((a) => ({
                        user_id: a.user_id,
                    })),
                },
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

        await logActivity(
            projectId,
            session.userId,
            "DEADLINE_COPIED",
            `Copied deadline "${original.title}" to "${title}"`
        );

        return NextResponse.json(
            { message: "Deadline copied successfully", deadline: serializeBigInt(newDeadline) },
            { status: 201 }
        );
    } catch (error) {
        console.error("Copy deadline error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
