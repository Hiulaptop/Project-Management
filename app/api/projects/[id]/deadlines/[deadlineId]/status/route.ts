import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";
import { logActivity } from "@/lib/activity";
import { DeadlineStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string; deadlineId: string }> };

// PATCH /api/projects/:id/deadlines/:deadlineId/status
export async function PATCH(
    request: NextRequest,
    { params }: Params
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, deadlineId } = await params;
        const projectId = BigInt(id);
        const dlId = BigInt(deadlineId);

        // Assignees, setter, OWNER, MANAGER can update status
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

        const existing = await db.deadlines.findUnique({
            where: { id: dlId, project_id: projectId },
            include: { assignees: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
        }

        const { status } = await request.json();

        if (!Object.values(DeadlineStatus).includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${Object.values(DeadlineStatus).join(", ")}` },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = { status };
        // Auto-set completion to 100% when DONE
        if (status === "DONE") updateData.completion = 100;

        const deadline = await db.deadlines.update({
            where: { id: dlId },
            data: updateData,
        });

        await logActivity(projectId, session.userId, "DEADLINE_STATUS_CHANGED", `Changed status of "${existing.title}" to ${status}`);

        return NextResponse.json(
            { message: "Status updated", deadline: serializeBigInt(deadline) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update status error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}