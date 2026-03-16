import { NextRequest, NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const cookieOptions = getSessionCookieOptions(request);
    const response = NextResponse.json({ message: "Signed out successfully" });
    response.cookies.set(cookieOptions.name, "", { ...cookieOptions, maxAge: 0 });
    return response;
}