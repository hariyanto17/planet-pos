import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTHENTICATED_PAGES = [
  "/dashboard",
  "/products",
  "/categories",
  "/promotions",
  "/tables",
  "/orders",
  "/kitchen",
  "/reports",
  "/users",
  "/profile",
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login";
  const isProtectedPage = AUTHENTICATED_PAGES.some((page) => pathname.startsWith(page)) || pathname === "/";

  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
