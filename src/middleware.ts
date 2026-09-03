import { NextRequest, NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const session = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  const home = session ? (session.role === "admin" ? "/dashboard" : "/update") : "/login";

  if (pathname === "/") {
    return NextResponse.redirect(new URL(home, req.url));
  }
  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL(home, req.url));
    return NextResponse.next();
  }
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) && session.role !== "admin") {
    return NextResponse.redirect(new URL("/update", req.url));
  }
  if (pathname.startsWith("/update") && session.role !== "team") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
