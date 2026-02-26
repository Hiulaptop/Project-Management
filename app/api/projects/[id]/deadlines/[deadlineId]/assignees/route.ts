import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

type Params = { params: Promise<{ id: string; deadlineId: string }> };

// POST /api/projects/:id/deadlines/:deadlineId/assignees
export async function POST(
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

        // Only OWNER or MANAGER can assign
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

        const existing = await db.deadlines.findUnique({
            where: { id: dlId, project_id: projectId },
        });

        if (!existing) {
            return NextResponse.json({ error: "Deadline not found" }, { status: 404 });
        }

        const { user_ids } = await request.json();

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return NextResponse.json(
                { error: "user_ids array is required" },
                { status: 400 }
            );
        }

        // Verify all users are project members
        const members = await db.project_members.findMany({
            where: {
                project_id: projectId,
                user_id: { in: user_ids },
            },
        });

        if (members.length !== user_ids.length) {
            return NextResponse.json(
                { error: "Some users are not members of this project" },
                { status: 400 }
            );
        }

        await db.deadline_assignees.createMany({
            data: user_ids.map((userId: string) => ({
                deadline_id: dlId,
                user_id: userId,
            })),
            skipDuplicates: true,
        });

        const assignees = await db.deadline_assignees.findMany({
            where: { deadline_id: dlId },
            include: {
                user: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
            },
        });

        return NextResponse.json(
            { message: "Assignees added", assignees: serializeBigInt(assignees) },
            { status: 201 }
        );
    } catch (error) {
        console.error("Add assignees error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET /api/projects/:id/deadlines/:deadlineId/assignees
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

        const assignees = await db.deadline_assignees.findMany({
            where: { deadline_id: dlId },
            include: {
                user: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
            },
        });

        return NextResponse.json(
            { assignees: serializeBigInt(assignees) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get assignees error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}