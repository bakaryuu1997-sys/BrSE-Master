import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "brse_test_access";
const PASSWORD = process.env.TEST_GATE_PASSWORD?.trim() ?? "";
const TOKEN = `brse-test-${PASSWORD}`;

function gateEnabled() {
  return process.env.TEST_GATE_ENABLED === "true" && PASSWORD.length > 0;
}

export function proxy(request: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const allowed =
    pathname.startsWith("/api") ||
    pathname.startsWith("/test-access") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon.svg" ||
    pathname === "/sw.js";

  if (allowed) return NextResponse.next();

  if (request.cookies.get(COOKIE_NAME)?.value === TOKEN) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/test-access";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*", "/sw.js", "/manifest.webmanifest"],
};
