import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/notifications/:id — Mark single as read/unread
export async function PATCH(
    request: NextRequest,
    { params }: Params
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const notifId = BigInt(id);

        const notification = await db.notification.findUnique({
            where: { id: notifId },
        });

        if (!notification || notification.user_id !== session.userId) {
            return NextResponse.json(
                { error: "Notification not found" },
                { status: 404 }
            );
        }

        const { is_read } = await request.json();

        const updated = await db.notification.update({
            where: { id: notifId },
            data: { is_read: is_read !== undefined ? is_read : true },
        });

        return NextResponse.json(
            { notification: serializeBigInt(updated) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update notification error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/notifications/:id — Delete notification
export async function DELETE(
    _request: NextRequest,
    { params }: Params
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const notifId = BigInt(id);

        const notification = await db.notification.findUnique({
            where: { id: notifId },
        });

        if (!notification || notification.user_id !== session.userId) {
            return NextResponse.json(
                { error: "Notification not found" },
                { status: 404 }
            );
        }

        await db.notification.delete({ where: { id: notifId } });

        return NextResponse.json(
            { message: "Notification deleted" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Delete notification error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}