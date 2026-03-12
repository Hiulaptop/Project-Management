import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

// GET /api/chat — get recent messages
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
        const before = searchParams.get("before");

        const messages = await db.chatMessage.findMany({
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            ...(before ? { cursor: { id: BigInt(before) }, skip: 1 } : {}),
            include: {
                user: {
                    select: { id: true, fullname: true, username: true },
                },
            },
        });

        const hasMore = messages.length > limit;
        const items = hasMore ? messages.slice(0, limit) : messages;
        const nextCursor = hasMore ? items[items.length - 1].id.toString() : null;

        // Return in chronological order (oldest first)
        items.reverse();

        return NextResponse.json(
            { messages: serializeBigInt(items), nextCursor },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get chat messages error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST /api/chat — send a message
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message } = await request.json();

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        if (message.length > 2000) {
            return NextResponse.json(
                { error: "Message too long (max 2000 characters)" },
                { status: 400 }
            );
        }

        const chatMessage = await db.chatMessage.create({
            data: {
                user_id: session.userId,
                message: message.trim(),
            },
            include: {
                user: {
                    select: { id: true, fullname: true, username: true },
                },
            },
        });

        return NextResponse.json(
            { message: serializeBigInt(chatMessage) },
            { status: 201 }
        );
    } catch (error) {
        console.error("Send chat message error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
