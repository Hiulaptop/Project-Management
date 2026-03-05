import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

// GET /api/notifications — List notifications
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get("unread_only") === "true";
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const cursor = searchParams.get("cursor"); // for pagination

        const where: Record<string, unknown> = { user_id: session.userId };
        if (unreadOnly) {
            where.is_read = false;
        }

        const notifications = await db.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            ...(cursor
                ? {
                      cursor: { id: BigInt(cursor) },
                      skip: 1,
                  }
                : {}),
        });

        const unreadCount = await db.notification.count({
            where: { user_id: session.userId, is_read: false },
        });

        return NextResponse.json(
            {
                notifications: serializeBigInt(notifications),
                unreadCount,
                nextCursor:
                    notifications.length === limit
                        ? serializeBigInt(notifications[notifications.length - 1].id)
                        : null,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get notifications error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/notifications — Mark all as read
export async function PATCH(): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await db.notification.updateMany({
            where: { user_id: session.userId, is_read: false },
            data: { is_read: true },
        });

        return NextResponse.json(
            { message: "All notifications marked as read", count: result.count },
            { status: 200 }
        );
    } catch (error) {
        console.error("Mark all read error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}