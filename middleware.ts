import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware sets a stable demo-user cookie on first visit (dev mode only).
 * When Clerk is configured, Clerk's middleware owns auth instead.
 */
export function middleware(req: NextRequest) {
  const hasClerk = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
  const res = NextResponse.next();
  if (!hasClerk && !req.cookies.get("crabcake_demo_user")) {
    const id =
      "d" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36);
    res.cookies.set("crabcake_demo_user", id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)"],
};
