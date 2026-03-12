import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

// GET /api/projects/:id/gantt — get Gantt chart data for a project
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

        const project = await db.project.findUnique({
            where: { id: projectId },
            select: {
                id: true,
                title: true,
                start_date: true,
                end_date: true,
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const deadlines = await db.deadlines.findMany({
            where: { project_id: projectId },
            select: {
                id: true,
                title: true,
                deadline_date: true,
                status: true,
                priority: true,
                completion: true,
                createdAt: true,
                assignees: {
                    select: {
                        user: {
                            select: { id: true, fullname: true, username: true },
                        },
                    },
                },
            },
            orderBy: { deadline_date: "asc" },
        });

        // For Gantt, each deadline has a start (created_at) and end (deadline_date)
        const ganttItems = deadlines.map((dl) => ({
            id: serializeBigInt(dl.id),
            title: dl.title,
            start: dl.createdAt.toISOString(),
            end: dl.deadline_date.toISOString(),
            status: dl.status,
            priority: dl.priority,
            completion: dl.completion,
            assignees: dl.assignees.map((a) => ({
                id: a.user.id,
                fullname: a.user.fullname,
                username: a.user.username,
            })),
        }));

        return NextResponse.json({
            project: {
                id: serializeBigInt(project.id),
                title: project.title,
                start_date: project.start_date?.toISOString() ?? null,
                end_date: project.end_date?.toISOString() ?? null,
            },
            items: ganttItems,
        });
    } catch (error) {
        console.error("Gantt data error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
