import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// PATCH /api/me/password — Change password
export async function PATCH(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { current_password, new_password } = await request.json();

        if (!current_password || !new_password) {
            return NextResponse.json(
                { error: "Current password and new password are required" },
                { status: 400 }
            );
        }

        if (new_password.length < 8) {
            return NextResponse.json(
                { error: "New password must be at least 8 characters" },
                { status: 400 }
            );
        }

        const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { password: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const passwordMatch = await bcrypt.compare(current_password, user.password);
        if (!passwordMatch) {
            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 401 }
            );
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.user.update({
            where: { id: session.userId },
            data: { password: hashedPassword },
        });

        return NextResponse.json(
            { message: "Password changed successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}