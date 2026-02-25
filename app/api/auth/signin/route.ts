import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const { identifier, password } = await request.json();

        if (!identifier || !password) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }
        const user = await db.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                    { phone_number: identifier },
                ]
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            )
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        await createSession(user.id, user.email);

        return NextResponse.json(
            { message: "Signed in successfully" },
            { status: 200 }
        );
    }
    catch (error) {
        console.error("Signin error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}