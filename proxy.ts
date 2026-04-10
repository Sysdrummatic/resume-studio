import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "./app/lib/auth-cookies";

const PROTECTED_PREFIXES = ["/dashboard", "/master-resume", "/user", "/admin"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "session");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/master-resume/:path*", "/user/:path*", "/admin/:path*"],
};
