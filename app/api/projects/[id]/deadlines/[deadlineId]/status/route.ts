import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";
import { DeadlineStatus } from "@/prisma/generated/prisma/client";

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

        const deadline = await db.deadlines.update({
            where: { id: dlId },
            data: { status },
        });

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