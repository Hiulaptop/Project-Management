import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET /api/me — Get current user profile
export async function GET(): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                email: true,
                username: true,
                fullname: true,
                phone_number: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        ownedProjects: true,
                        projectMembers: true,
                        deadlineAssigns: true,
                        colleaguesSent: true,
                        colleaguesReceived: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user }, { status: 200 });
    } catch (error) {
        console.error("Get profile error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PATCH /api/me — Update profile
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { fullname, email, username, phone_number } = await request.json();

        const updateData: Record<string, string> = {};
        if (fullname !== undefined) updateData.fullname = fullname;
        if (email !== undefined) updateData.email = email;
        if (username !== undefined) updateData.username = username;
        if (phone_number !== undefined) updateData.phone_number = phone_number;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        // Check uniqueness for email, username, phone_number
        if (email || username || phone_number) {
            const conflicts = await db.user.findFirst({
                where: {
                    id: { not: session.userId },
                    OR: [
                        ...(email ? [{ email }] : []),
                        ...(username ? [{ username }] : []),
                        ...(phone_number ? [{ phone_number }] : []),
                    ],
                },
                select: { email: true, username: true, phone_number: true },
            });

            if (conflicts) {
                const conflictFields: string[] = [];
                if (conflicts.email === email) conflictFields.push("email");
                if (conflicts.username === username) conflictFields.push("username");
                if (conflicts.phone_number === phone_number) conflictFields.push("phone number");

                return NextResponse.json(
                    { error: `The following fields are already in use: ${conflictFields.join(", ")}` },
                    { status: 409 }
                );
            }
        }

        const user = await db.user.update({
            where: { id: session.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                fullname: true,
                phone_number: true,
                role: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(
            { message: "Profile updated successfully", user },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update profile error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}