import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

// GET /api/dashboard/stats — dashboard statistics for current user
export async function GET(): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.userId;

        // Get all projects the user is a member of
        const memberships = await db.project_members.findMany({
            where: { user_id: userId },
            select: { project_id: true },
        });
        const projectIds = memberships.map((m) => m.project_id);

        // Total projects
        const totalProjects = projectIds.length;

        // Total deadlines across all projects
        const totalDeadlines = await db.deadlines.count({
            where: { project_id: { in: projectIds } },
        });

        // Deadlines by status
        const byStatus = await db.deadlines.groupBy({
            by: ["status"],
            where: { project_id: { in: projectIds } },
            _count: true,
        });

        const statusCounts: Record<string, number> = {
            TODO: 0,
            IN_PROGRESS: 0,
            REVIEW: 0,
            DONE: 0,
            CANCELLED: 0,
        };
        for (const row of byStatus) {
            statusCounts[row.status] = row._count;
        }

        // Deadlines by priority
        const byPriority = await db.deadlines.groupBy({
            by: ["priority"],
            where: { project_id: { in: projectIds } },
            _count: true,
        });

        const priorityCounts: Record<string, number> = {
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
        };
        for (const row of byPriority) {
            if (row.priority) {
                priorityCounts[row.priority] = row._count;
            }
        }

        // Overdue count
        const now = new Date();
        const overdueCount = await db.deadlines.count({
            where: {
                project_id: { in: projectIds },
                deadline_date: { lt: now },
                status: { notIn: ["DONE", "CANCELLED"] },
            },
        });

        // Average completion across non-cancelled deadlines
        const completionAgg = await db.deadlines.aggregate({
            where: {
                project_id: { in: projectIds },
                status: { not: "CANCELLED" },
            },
            _avg: { completion: true },
        });
        const averageCompletion = Math.round(completionAgg._avg.completion ?? 0);

        // Deadlines assigned to the user
        const myAssignments = await db.deadline_assignees.count({
            where: {
                user_id: userId,
                deadline: { project_id: { in: projectIds } },
            },
        });

        // Per-project summary (top 10 by most deadlines)
        const projectSummaries = await db.project.findMany({
            where: { id: { in: projectIds } },
            select: {
                id: true,
                title: true,
                _count: { select: { deadlines: true, members: true } },
                deadlines: {
                    select: { status: true, completion: true },
                },
            },
            orderBy: { deadlines: { _count: "desc" } },
            take: 10,
        });

        const projects = projectSummaries.map((p) => {
            const done = p.deadlines.filter((d) => d.status === "DONE").length;
            const total = p.deadlines.length;
            const avgComp =
                total > 0
                    ? Math.round(
                          p.deadlines.reduce((sum, d) => sum + d.completion, 0) / total
                      )
                    : 0;
            return {
                id: serializeBigInt(p.id),
                title: p.title,
                totalDeadlines: total,
                completedDeadlines: done,
                memberCount: p._count.members,
                averageCompletion: avgComp,
            };
        });

        return NextResponse.json({
            totalProjects,
            totalDeadlines,
            statusCounts,
            priorityCounts,
            overdueCount,
            averageCompletion,
            myAssignments,
            projects,
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
