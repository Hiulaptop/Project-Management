import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

// GET /api/projects/:id/members
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
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const members = await db.project_members.findMany({
            where: { project_id: projectId },
            include: {
                user: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
            },
        });

        return NextResponse.json(
            { members: serializeBigInt(members) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get members error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/projects/:id/members — Add a member
export async function POST(
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

        // Only OWNER or MANAGER can add members
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

        const { user_id, role_in_project } = await request.json();

        if (!user_id) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Check if user is an accepted colleague
        const isColleague = await db.userColleague.findFirst({
            where: {
                status: "ACCEPTED",
                OR: [
                    { sender_id: session.userId, receiver_id: user_id },
                    { sender_id: user_id, receiver_id: session.userId },
                ],
            },
        });

        if (!isColleague) {
            return NextResponse.json(
                { error: "You can only add accepted colleagues" },
                { status: 400 }
            );
        }

        // Check if already a member
        const existingMember = await db.project_members.findUnique({
            where: {
                project_id_user_id: {
                    project_id: projectId,
                    user_id: user_id,
                },
            },
        });

        if (existingMember) {
            return NextResponse.json(
                { error: "User is already a member" },
                { status: 409 }
            );
        }

        const member = await db.project_members.create({
            data: {
                project_id: projectId,
                user_id: user_id,
                role_in_project: role_in_project || "MEMBER",
            },
            include: {
                user: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
            },
        });

        return NextResponse.json(
            { message: "Member added successfully", member: serializeBigInt(member) },
            { status: 201 }
        );
    } catch (error) {
        console.error("Add member error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}