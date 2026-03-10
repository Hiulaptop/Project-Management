import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET /api/colleagues/requests — List pending requests received
export async function GET(): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requests = await db.userColleague.findMany({
            where: {
                receiver_id: session.userId,
                status: "PENDING",
            },
            include: {
                sender: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ requests }, { status: 200 });
    } catch (error) {
        console.error("Get requests error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}