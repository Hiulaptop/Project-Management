import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string; deadlineId: string }> };

// GET /api/projects/:id/deadlines/:deadlineId
export async function GET(
    _request: NextRequest,
    { params }: Params
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, deadlineId } = await params;
        const projectId = BigInt(id);

        // Check membership
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

        const deadline = await db.deadlines.findUnique({
            where: { id: BigInt(deadlineId), project_id: projectId },
            include: {
                project: { select: { id: true, title: true } },
                setter: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
                assignees: {
                    include: {
                        user: {
                            select: { id: true, fullname: true, username: true, email: true },
                        },
                    },
                },
            },
        });

        if (!deadline) {
            return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
        }

        return NextResponse.json(
            { deadline: serializeBigInt(deadline) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get deadline error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/projects/:id/deadlines/:deadlineId
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

        // Check membership — only OWNER, MANAGER, or the setter can update
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
        });

        if (!existing) {
            return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
        }

        const isSetterOrPrivileged =
            existing.setter_id === session.userId ||
            membership.role_in_project === "OWNER" ||
            membership.role_in_project === "MANAGER";

        if (!isSetterOrPrivileged) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { title, description, deadline_date, priority, completion, target, result_links, output } = await request.json();

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (deadline_date !== undefined)
            updateData.deadline_date = new Date(deadline_date);
        if (priority !== undefined) updateData.priority = priority;
        if (completion !== undefined) {
            const c = Math.max(0, Math.min(100, Number(completion)));
            updateData.completion = c;
        }
        if (target !== undefined) updateData.target = target;
        if (result_links !== undefined) updateData.result_links = result_links;
        if (output !== undefined) updateData.output = output;

        const deadline = await db.deadlines.update({
            where: { id: dlId },
            data: updateData,
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

        await logActivity(projectId, session.userId, "DEADLINE_UPDATED", `Updated deadline: ${deadline.title}`);

        return NextResponse.json(
            { message: "Deadline updated successfully", deadline: serializeBigInt(deadline) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update deadline error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/projects/:id/deadlines/:deadlineId
export async function DELETE(
    _request: NextRequest,
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
        });

        if (!existing) {
            return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
        }

        const isSetterOrPrivileged =
            existing.setter_id === session.userId ||
            membership.role_in_project === "OWNER" ||
            membership.role_in_project === "MANAGER";

        if (!isSetterOrPrivileged) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.deadlines.delete({ where: { id: dlId } });

        await logActivity(projectId, session.userId, "DEADLINE_DELETED", `Deleted deadline: ${existing.title}`);

        return NextResponse.json(
            { message: "Deadline deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Delete deadline error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}