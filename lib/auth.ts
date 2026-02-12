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


export async function encript(payload: SessionPayload): Promise<string>{
    return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decript(token: string): Promise<SessionPayload>{
    try{
        const { payload } = await jwtVerify(token, key, {algorithms: ["HS256"]});

        return payload as unknown as SessionPayload;
    } catch (error: unknown){
        return null as unknown as SessionPayload;
    }
}