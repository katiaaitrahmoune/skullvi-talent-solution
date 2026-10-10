import { NextResponse, type NextRequest } from "next/server";

// Light gate: no token cookie, no admin pages. The backend verifies the token on every call.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (!req.cookies.get("skv_token")) return NextResponse.redirect(new URL("/admin/login", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*", "/reviewer/:path*"] };
