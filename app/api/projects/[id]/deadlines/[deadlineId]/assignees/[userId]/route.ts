import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Params = {
    params: Promise<{ id: string; deadlineId: string; userId: string }>;
};

// DELETE /api/projects/:id/deadlines/:deadlineId/assignees/:userId
export async function DELETE(
    _request: NextRequest,
    { params }: Params
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, deadlineId, userId } = await params;
        const projectId = BigInt(id);
        const dlId = BigInt(deadlineId);

        // Only OWNER, MANAGER, or the assignee themselves can remove
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

        const isSelf = session.userId === userId;
        const isPrivileged =
            membership.role_in_project === "OWNER" ||
            membership.role_in_project === "MANAGER";

        if (!isSelf && !isPrivileged) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check the assignee exists
        const assignee = await db.deadline_assignees.findUnique({
            where: {
                deadline_id_user_id: {
                    deadline_id: dlId,
                    user_id: userId,
                },
            },
        });

        if (!assignee) {
            return NextResponse.json(
                { error: "Assignee not found" },
                { status: 404 }
            );
        }

        await db.deadline_assignees.delete({
            where: {
                deadline_id_user_id: {
                    deadline_id: dlId,
                    user_id: userId,
                },
            },
        });

        return NextResponse.json(
            { message: "Assignee removed successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Remove assignee error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
