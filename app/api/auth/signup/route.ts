import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const { email, username, password, fullname, phone_number } = await request.json();

        if (!fullname || !email || !password || !username || !phone_number) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        const existingUser = await db.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username },
                    { phone_number },
                ],
            },
            select: { email: true, username: true, phone_number: true },
        });
        if (existingUser) {
            const conflig: string[] = [];
            if (existingUser.email === email) conflig.push("email");
            if (existingUser.username === username) conflig.push("username");
            if (existingUser.phone_number === phone_number) conflig.push("phone number");
            
            return NextResponse.json(
                { error: `The following fields are already in use: ${conflig.join(", ")}` },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await db.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                fullname,
                phone_number,
            },
        });

        const userId = user.id;

        await createSession(userId, email);
        return NextResponse.json(
            { message: "User created successfully" },
            { status: 201 }
        )
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}