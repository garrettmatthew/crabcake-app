import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * hasClerk: true when Clerk keys are set.
 * When false, the app runs in DEV AUTH mode — a cookie identifies the current user.
 * This lets the backend work end-to-end before Clerk is wired up.
 */
export const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

const DEMO_COOKIE = "crabcake_demo_user";

/**
 * Returns the current user's DB row. Creates one if missing.
 * Works with Clerk (real auth) or falls back to a cookie-based demo user.
 */
export async function getCurrentUser() {
  if (hasClerk) {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    const row = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (row) return row;
    // First time seeing this Clerk user — create their DB row.
    const cu = await currentUser();
    const id = nanoid();
    const [created] = await db
      .insert(users)
      .values({
        id,
        clerkId: userId,
        email: cu?.primaryEmailAddress?.emailAddress ?? null,
        displayName:
          (cu?.firstName && cu?.lastName ? `${cu.firstName} ${cu.lastName}` : cu?.firstName) ??
          cu?.username ??
          null,
      })
      .returning();
    return created;
  }

  // Dev mode — read cookie; on first visit, create a demo user.
  const jar = await cookies();
  let demoId = jar.get(DEMO_COOKIE)?.value;
  if (!demoId) {
    demoId = nanoid();
    // cookies.set is only valid in Server Actions / Route Handlers, so we
    // fall back to looking up OR creating in a route-safe pattern below.
  }
  if (demoId) {
    const row = await db.query.users.findFirst({ where: eq(users.clerkId, `demo_${demoId}`) });
    if (row) return row;
  }
  // Auto-seed a demo user and return without setting a cookie
  // (the /api/auth/demo route sets it).
  return null;
}

/** For use in Server Actions / Route Handlers — can set cookies. */
export async function ensureDemoUser() {
  if (hasClerk) return getCurrentUser();
  const jar = await cookies();
  let demoId = jar.get(DEMO_COOKIE)?.value;
  if (!demoId) {
    demoId = nanoid();
    jar.set(DEMO_COOKIE, demoId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const clerkId = `demo_${demoId}`;
  const existing = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (existing) return existing;
  const id = nanoid();
  const [created] = await db
    .insert(users)
    .values({
      id,
      clerkId,
      displayName: "Ray Lewis",
      bio: "Baltimore native. On a mission to rank every crab cake in America.",
      avatarSwatch: "g1",
    })
    .returning();
  return created;
}

export async function requireUser() {
  const user = await ensureDemoUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}
