import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token";

/**
 * First line of defence only: redirects visitors without a valid session to
 * the login pages. The real authorization happens again in the data access
 * layer, in every server action and in every route handler.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const secret = process.env.SESSION_SECRET ?? "";
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, secret);

  const isPlayerLogin = pathname === "/login";
  const isAdminLogin = pathname === "/admin/login";
  const isApi = pathname.startsWith("/api/");

  if (!session) {
    if (isPlayerLogin) return NextResponse.next();
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (isPlayerLogin) return NextResponse.redirect(new URL("/campaigns", request.url));

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
  if (isAdminArea && session.role !== "admin" && !isAdminLogin) {
    if (isApi) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (isAdminLogin && session.role === "admin") return NextResponse.redirect(new URL("/admin", request.url));

  return NextResponse.next();
}

export const config = {
  // Everything except Next.js internals and the public, non-confidential static files.
  matcher: ["/((?!_next/static|_next/image|images/|fonts/|favicon.ico|robots.txt).*)"],
};
