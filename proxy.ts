import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

/**
 * When Clerk keys are set, Clerk owns auth.
 * When not, we drop a stable demo-user cookie so the app is usable
 * end-to-end for local dev / preview.
 */
const demo = (req: NextRequest) => {
  const res = NextResponse.next();
  if (!req.cookies.get("crabcake_demo_user")) {
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
};

export default hasClerk ? clerkMiddleware() : demo;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
