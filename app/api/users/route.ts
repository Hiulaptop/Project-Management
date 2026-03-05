import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET /api/users?search=keyword&limit=20
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.trim();
        const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

        if (!search || search.length < 2) {
            return NextResponse.json(
                { error: "Search query must be at least 2 characters" },
                { status: 400 }
            );
        }

        const users = await db.user.findMany({
            where: {
                id: { not: session.userId }, // exclude self
                OR: [
                    { fullname: { contains: search, mode: "insensitive" } },
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone_number: { contains: search } },
                ],
            },
            select: {
                id: true,
                fullname: true,
                username: true,
                email: true,
            },
            take: limit,
            orderBy: { fullname: "asc" },
        });

        // Also fetch colleague relationship status for each found user
        const userIds = users.map((u) => u.id);
        const relationships = await db.userColleague.findMany({
            where: {
                OR: [
                    { sender_id: session.userId, receiver_id: { in: userIds } },
                    { sender_id: { in: userIds }, receiver_id: session.userId },
                ],
            },
            select: {
                sender_id: true,
                receiver_id: true,
                status: true,
            },
        });

        const relationshipMap = new Map<string, string>();
        for (const rel of relationships) {
            const otherId =
                rel.sender_id === session.userId ? rel.receiver_id : rel.sender_id;
            relationshipMap.set(otherId, rel.status);
        }

        const results = users.map((user) => ({
            ...user,
            colleague_status: relationshipMap.get(user.id) || null,
        }));

        return NextResponse.json({ users: results }, { status: 200 });
    } catch (error) {
        console.error("Search users error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}