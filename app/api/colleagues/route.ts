import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET /api/colleagues — List accepted colleagues
export async function GET(): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const colleagues = await db.userColleague.findMany({
            where: {
                status: "ACCEPTED",
                OR: [
                    { sender_id: session.userId },
                    { receiver_id: session.userId },
                ],
            },
            include: {
                sender: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
                receiver: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Normalize: always return the "other" person
        const result = colleagues.map((c) => ({
            user: c.sender_id === session.userId ? c.receiver : c.sender,
            since: c.createdAt,
        }));

        return NextResponse.json({ colleagues: result }, { status: 200 });
    } catch (error) {
        console.error("Get colleagues error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/colleagues — Send colleague invite
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { receiver_id } = await request.json();

        if (!receiver_id) {
            return NextResponse.json(
                { error: "receiver_id is required" },
                { status: 400 }
            );
        }

        if (receiver_id === session.userId) {
            return NextResponse.json(
                { error: "Cannot send invite to yourself" },
                { status: 400 }
            );
        }

        // Check receiver exists
        const receiver = await db.user.findUnique({
            where: { id: receiver_id },
            select: { id: true, fullname: true, username: true },
        });

        if (!receiver) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Check if relationship already exists (in either direction)
        const existing = await db.userColleague.findFirst({
            where: {
                OR: [
                    { sender_id: session.userId, receiver_id },
                    { sender_id: receiver_id, receiver_id: session.userId },
                ],
            },
        });

        if (existing) {
            if (existing.status === "ACCEPTED") {
                return NextResponse.json(
                    { error: "Already colleagues" },
                    { status: 409 }
                );
            }
            if (existing.status === "PENDING") {
                return NextResponse.json(
                    { error: "Invite already pending" },
                    { status: 409 }
                );
            }
            if (existing.status === "BLOCKED") {
                return NextResponse.json(
                    { error: "Cannot send invite to this user" },
                    { status: 403 }
                );
            }
        }

        const invite = await db.userColleague.create({
            data: {
                sender_id: session.userId,
                receiver_id,
            },
            include: {
                receiver: {
                    select: { id: true, fullname: true, username: true },
                },
            },
        });

        // Create notification for receiver
        await db.notification.create({
            data: {
                user_id: receiver_id,
                type: "COLLEAGUE_REQUEST",
                title: "Lời mời kết nối",
                message: `${(await db.user.findUnique({ where: { id: session.userId }, select: { fullname: true } }))?.fullname} đã gửi lời mời kết nối đồng nghiệp.`,
                from_user_id: session.userId,
            },
        });

        return NextResponse.json(
            { message: "Invite sent successfully", invite },
            { status: 201 }
        );
    } catch (error) {
        console.error("Send invite error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}