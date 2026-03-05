import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/auth/signin", "/auth/signup", "/api/auth/signin", "/api/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes and static assets
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session")?.value;

  // Public pages: redirect to dashboard if already logged in
  if (publicPaths.includes(pathname)) {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protected pages: redirect to signin if no session
  if (!session) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};