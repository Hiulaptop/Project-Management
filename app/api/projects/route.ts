import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

export async function GET(): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const projects = await db.project.findMany({
            where: {
                members: {
                    some: { user_id: session.userId },
                },
            },
            include: {
                owner: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
                members: {
                    select: { user_id: true, role_in_project: true },
                },
                _count: {
                    select: { deadlines: true, members: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ projects }, { status: 200 });
    }
    catch (error) {
        console.error("Get projects error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await getAuthUser();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { title, description, start_date, end_date } = await request.json();

        if (!title || !start_date) {
            return NextResponse.json(
                { error: "Title and start date are required" },
                { status: 400 }
            );
        }

        if (end_date && new Date(end_date) <= new Date(start_date)) {
            return NextResponse.json(
                { error: "End date must be after start date" },
                { status: 400 }
            );
        }

        const project = await db.project.create({
            data: {
                title,
                description: description || null,
                start_date: new Date(start_date),
                end_date: end_date ? new Date(end_date) : null,
                owner_id: session.userId,
                // Auto-add creator as OWNER member
                members: {
                    create: {
                        user_id: session.userId,
                        role_in_project: "OWNER",
                    },
                },
            },
            include: {
                owner: {
                    select: { id: true, fullname: true, username: true, email: true },
                },
                members: true,
            },
        });
        return NextResponse.json(
            { message: "Project created successfully", project: serializeBigInt(project) },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create project error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}