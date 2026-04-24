import { cookies } from "next/headers";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

const DEMO_COOKIE = "crabcake_demo_user";

/**
 * Returns the current user's DB row, creating one if needed.
 * In dev mode, the middleware sets the demo cookie on first visit.
 * In Clerk mode, we resolve the Clerk user.
 */
export async function getCurrentUser() {
  if (hasClerk) {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    const cu = await currentUser();
    const email = cu?.primaryEmailAddress?.emailAddress ?? null;
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const shouldBeAdmin = email != null && adminEmails.includes(email.toLowerCase());

    const row = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (row) {
      // Auto-elevate if email matches ADMIN_EMAILS
      if (shouldBeAdmin && row.role !== "admin") {
        const [updated] = await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.id, row.id))
          .returning();
        return updated;
      }
      return row;
    }
    const id = nanoid();
    const [created] = await db
      .insert(users)
      .values({
        id,
        clerkId: userId,
        email,
        role: shouldBeAdmin ? "admin" : "user",
        displayName:
          (cu?.firstName && cu?.lastName
            ? `${cu.firstName} ${cu.lastName}`
            : cu?.firstName) ??
          cu?.username ??
          null,
      })
      .returning();
    return created;
  }

  // Dev mode — read cookie set by middleware; create DB row on first access.
  const jar = await cookies();
  const demoId = jar.get(DEMO_COOKIE)?.value;
  if (!demoId) return null; // middleware hasn't run yet
  const clerkId = `demo_${demoId}`;
  const existing = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (existing) return existing;
  const id = nanoid();
  const [created] = await db
    .insert(users)
    .values({
      id,
      clerkId,
      displayName: null,
      avatarSwatch: "g1",
    })
    .returning();
  return created;
}

/** Alias used throughout the app — same as getCurrentUser now. */
export const ensureDemoUser = getCurrentUser;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
}
