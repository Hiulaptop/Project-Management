import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

type Params = { params: Promise<{ id: string; deadlineId: string }> };

// PATCH /api/projects/:id/deadlines/:deadlineId/feedback
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

        // Only OWNER or MANAGER can give feedback
        const membership = await db.project_members.findUnique({
            where: {
                project_id_user_id: {
                    project_id: projectId,
                    user_id: session.userId,
                },
            },
        });

        if (
            !membership ||
            membership.role_in_project === "MEMBER"
        ) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const existing = await db.deadlines.findUnique({
            where: { id: dlId, project_id: projectId },
        });

        if (!existing) {
            return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
        }

        const { feedback } = await request.json();

        const deadline = await db.deadlines.update({
            where: { id: dlId },
            data: { feedback },
        });

        return NextResponse.json(
            { message: "Feedback updated", deadline: serializeBigInt(deadline) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update feedback error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}