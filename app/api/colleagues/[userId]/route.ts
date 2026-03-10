import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ userId: string }> };

// PATCH /api/colleagues/:userId — Accept or Block
export async function PATCH(
    request: NextRequest,
    { params }: Params
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId } = await params;
        const { status } = await request.json();

        if (!status || !["ACCEPTED", "BLOCKED"].includes(status)) {
            return NextResponse.json(
                { error: "Status must be ACCEPTED or BLOCKED" },
                { status: 400 }
            );
        }

        // Find the relationship (user must be the receiver to accept/block)
        const relationship = await db.userColleague.findFirst({
            where: {
                OR: [
                    { sender_id: userId, receiver_id: session.userId },
                    { sender_id: session.userId, receiver_id: userId },
                ],
            },
        });

        if (!relationship) {
            return NextResponse.json(
                { error: "Relationship not found" },
                { status: 404 }
            );
        }

        // Only the receiver can accept; either party can block
        if (status === "ACCEPTED") {
            if (relationship.receiver_id !== session.userId) {
                return NextResponse.json(
                    { error: "Only the receiver can accept an invite" },
                    { status: 403 }
                );
            }
            if (relationship.status !== "PENDING") {
                return NextResponse.json(
                    { error: "Invite is not pending" },
                    { status: 400 }
                );
            }
        }

        const updated = await db.userColleague.update({
            where: {
                sender_id_receiver_id: {
                    sender_id: relationship.sender_id,
                    receiver_id: relationship.receiver_id,
                },
            },
            data: { status },
            include: {
                sender: {
                    select: { id: true, fullname: true, username: true },
                },
                receiver: {
                    select: { id: true, fullname: true, username: true },
                },
            },
        });

        // Notify sender when accepted
        if (status === "ACCEPTED") {
            const me = await db.user.findUnique({
                where: { id: session.userId },
                select: { fullname: true },
            });
            await db.notification.create({
                data: {
                    user_id: userId,
                    type: "COLLEAGUE_ACCEPTED",
                    title: "Lời mời được chấp nhận",
                    message: `${me?.fullname} đã chấp nhận lời mời kết nối của bạn.`,
                    from_user_id: session.userId,
                },
            });
        }

        return NextResponse.json(
            { message: `Colleague ${status.toLowerCase()} successfully`, relationship: updated },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update colleague error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE /api/colleagues/:userId — Remove/Reject relationship
export async function DELETE(
    _request: NextRequest,
    { params }: Params
): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId } = await params;

        const relationship = await db.userColleague.findFirst({
            where: {
                OR: [
                    { sender_id: session.userId, receiver_id: userId },
                    { sender_id: userId, receiver_id: session.userId },
                ],
            },
        });

        if (!relationship) {
            return NextResponse.json(
                { error: "Relationship not found" },
                { status: 404 }
            );
        }

        await db.userColleague.delete({
            where: {
                sender_id_receiver_id: {
                    sender_id: relationship.sender_id,
                    receiver_id: relationship.receiver_id,
                },
            },
        });

        return NextResponse.json(
            { message: "Colleague removed successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Remove colleague error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}