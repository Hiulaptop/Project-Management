import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

// GET /api/projects/:id/activities
export async function GET(
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
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
        const cursor = searchParams.get("cursor");

        const activities = await db.activityLog.findMany({
            where: { project_id: projectId },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            ...(cursor ? { cursor: { id: BigInt(cursor) }, skip: 1 } : {}),
            include: {
                user: {
                    select: { id: true, fullname: true, username: true },
                },
            },
        });

        const hasMore = activities.length > limit;
        const items = hasMore ? activities.slice(0, limit) : activities;
        const nextCursor = hasMore ? items[items.length - 1].id.toString() : null;

        return NextResponse.json(
            {
                activities: serializeBigInt(items),
                nextCursor,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Get activities error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
