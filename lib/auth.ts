import { Sign } from "crypto";
import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";


export interface SessionPayload {
  userId: string;
  email: string;
  expiresAt: string | number | Date;
}

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey)


export async function encrypt(payload: SessionPayload): Promise<string>{
    return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionPayload>{
    try{
        const { payload } = await jwtVerify(token, key, {algorithms: ["HS256"]});

        return payload as unknown as SessionPayload;
    } catch (error: unknown){
        return null as unknown as SessionPayload;
    }
}


export async function createSession(userId: string, email: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, email, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
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