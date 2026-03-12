import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";
import { logActivity } from "@/lib/activity";

// GET /api/projects/:id
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const projectId = BigInt(id);

        // Check if user is a member
        const membership = await db.project_members.findUnique({
            where: {
                project_id_user_id: {
                    project_id: projectId,
                    user_id: session.userId,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const project = await db.project.findUnique({
            where: { id: projectId },
            include: {
                owner: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, fullname: true, username: true, email: true },
                        },
                    },
                },
                deadlines: {
                    include: {
                        assignees: {
                            include: {
                                user: {
                                    select: { id: true, fullname: true, username: true },
                                },
                            },
                        },
                    },
                    orderBy: { deadline_date: "asc" },
                },
            },
        });

        return NextResponse.json(
            { project: serializeBigInt(project) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get project error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/projects/:id
export async function PATCH(
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

        // Only OWNER or MANAGER can update
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

        const { title, description, start_date, end_date } = await request.json();

        const updateData: Record<string, unknown> = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (start_date !== undefined) updateData.start_date = new Date(start_date);
        if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;

        const project = await db.project.update({
            where: { id: projectId },
            data: updateData,
        });

        await logActivity(projectId, session.userId, "PROJECT_UPDATED", `Updated project: ${project.title}`);

        return NextResponse.json(
            { message: "Project updated successfully", project: serializeBigInt(project) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update project error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/projects/:id
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const projectId = BigInt(id);

        // Only OWNER can delete
        const membership = await db.project_members.findUnique({
            where: {
                project_id_user_id: {
                    project_id: projectId,
                    user_id: session.userId,
                },
            },
        });

        if (!membership || membership.role_in_project !== "OWNER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.project.delete({ where: { id: projectId } });

        return NextResponse.json(
            { message: "Project deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Delete project error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}