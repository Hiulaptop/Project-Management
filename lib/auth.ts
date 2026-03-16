import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";


export interface SessionPayload {
  userId: string;
  email: string;
  expiresAt: string | number | Date;
}

function getKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}


export async function encrypt(payload: SessionPayload): Promise<string>{
    return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());
}

export async function decrypt(token: string): Promise<SessionPayload>{
    try{
        const { payload } = await jwtVerify(token, getKey(), {algorithms: ["HS256"]});

        return payload as unknown as SessionPayload;
    } catch (error: unknown){
        return null as unknown as SessionPayload;
    }
}


export const COOKIE_NAME = "session";

export function getSessionCookieOptions(request?: NextRequest) {
  const proto = request?.headers.get("x-forwarded-proto");
  const secure =
    proto === "https" ||
    (!proto && request?.url.startsWith("https://")) ||
    (!proto && process.env.NODE_ENV === "production");

  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  };
}

export async function createSession(userId: string, email: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await encrypt({ userId, email, expiresAt });
  return token;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function getAuthUser() {
  const session = await getSession();
  if (!session || !session.userId) return null;
  return session;
}