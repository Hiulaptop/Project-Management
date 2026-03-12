import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Lazy key initialization — read env var at request time, not module load time.
// proxy.ts may initialize before .env is fully loaded into the process.
function getJwtKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

// Paths that never require authentication
const publicPagePaths = ["/auth/signin", "/auth/signup"];
const publicApiPaths = ["/api/auth/signin", "/api/auth/signup"];

async function verifyJwt(token: string): Promise<boolean> {
  try {
    const key = getJwtKey();
    await jwtVerify(token, key, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets — always pass through
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;

  // --- API routes ---
  if (pathname.startsWith("/api/")) {
    // Public API endpoints — no auth needed
    if (publicApiPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Cron endpoints — use their own Bearer token auth, skip JWT check
    if (pathname.startsWith("/api/cron/")) {
      return NextResponse.next();
    }

    // All other API routes — require valid JWT
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const valid = await verifyJwt(session);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // --- Page routes ---

  // Public pages: redirect to dashboard if already logged in with valid JWT
  if (publicPagePaths.includes(pathname)) {
    if (session) {
      const valid = await verifyJwt(session);
      if (valid) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      // Invalid/expired JWT on public page — delete bad cookie and let them stay
      const response = NextResponse.next();
      response.cookies.delete("session");
      return response;
    }
    return NextResponse.next();
  }

  // Root redirect
  if (pathname === "/") {
    if (session) {
      const valid = await verifyJwt(session);
      if (valid) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Protected pages: require valid JWT (not just cookie existence)
  if (!session) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const valid = await verifyJwt(session);
  if (!valid) {
    // Delete the bad/expired cookie and redirect to signin
    const response = NextResponse.redirect(
      new URL("/auth/signin", request.url)
    );
    response.cookies.delete("session");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
