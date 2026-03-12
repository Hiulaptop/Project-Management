import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// POST /api/cron/overdue — detect overdue deadlines and create notifications
// Intended to be called by a cron job / scheduler
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Simple API key check for cron security
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();

        // Find all overdue deadlines not yet DONE or CANCELLED
        const overdueDeadlines = await db.deadlines.findMany({
            where: {
                deadline_date: { lt: now },
                status: { notIn: ["DONE", "CANCELLED"] },
            },
            include: {
                project: {
                    select: { id: true, title: true },
                },
                assignees: {
                    select: { user_id: true },
                },
                setter: {
                    select: { id: true },
                },
            },
        });

        let notificationsCreated = 0;

        for (const dl of overdueDeadlines) {
            // Collect unique users to notify: assignees + setter
            const userIds = new Set<string>();
            for (const a of dl.assignees) {
                userIds.add(a.user_id);
            }
            userIds.add(dl.setter.id);

            const daysOverdue = Math.floor(
                (now.getTime() - dl.deadline_date.getTime()) / (1000 * 60 * 60 * 24)
            );

            for (const userId of userIds) {
                // Avoid duplicate notifications: check if one was sent today
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const existing = await db.notification.findFirst({
                    where: {
                        user_id: userId,
                        type: "OVERDUE",
                        project_id: dl.project_id,
                        createdAt: { gte: today },
                        message: { contains: String(dl.id) },
                    },
                });

                if (!existing) {
                    await db.notification.create({
                        data: {
                            user_id: userId,
                            type: "OVERDUE",
                            title: "Nhiệm vụ quá hạn",
                            message: `Deadline "${dl.title}" in project "${dl.project.title}" is ${daysOverdue} day(s) overdue [#${dl.id}]`,
                            project_id: dl.project_id,
                        },
                    });
                    notificationsCreated++;
                }
            }
        }

        return NextResponse.json({
            overdueDeadlines: overdueDeadlines.length,
            notificationsCreated,
        });
    } catch (error) {
        console.error("Overdue cron error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
