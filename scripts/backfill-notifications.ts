/**
 * One-off backfill so the /notifications feed isn't empty for everyone
 * on first open. Pulls the last 7 days of:
 *
 *   - reactions  → notification for the review's author
 *   - follows    → notification for the followed user
 *   - new ratings → notification for every then-current follower of
 *     the reviewer ("followed_user_review")
 *
 * Inserts each notification with the original event's created_at and
 * read_at = now() so they're already marked read — the bell doesn't
 * scream on first open, but the feed has context.
 *
 * Idempotent: skips any (user_id, kind, actor_id, rating_id, spot_id)
 * combo that's already in the table.
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/backfill-notifications.ts
 */
import "dotenv/config";
import { db } from "../lib/db";
import {
  notifications,
  reactions,
  ratings,
  follows,
  users,
  spots,
} from "../lib/db/schema";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { nanoid } from "nanoid";

const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

async function alreadyExists(check: {
  userId: string;
  kind: string;
  actorId: string | null;
  ratingId: string | null;
  spotId: string | null;
}) {
  const conditions = [
    eq(notifications.userId, check.userId),
    eq(notifications.kind, check.kind),
  ];
  if (check.actorId) conditions.push(eq(notifications.actorId, check.actorId));
  if (check.ratingId)
    conditions.push(eq(notifications.ratingId, check.ratingId));
  if (check.spotId) conditions.push(eq(notifications.spotId, check.spotId));
  const existing = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(...conditions))
    .limit(1);
  return existing.length > 0;
}

async function insertBackfilled(input: {
  userId: string;
  kind: string;
  actorId?: string | null;
  ratingId?: string | null;
  spotId?: string | null;
  meta?: string | null;
  createdAt: Date;
}) {
  // Self-events don't make sense.
  if (input.actorId && input.actorId === input.userId) return false;
  const exists = await alreadyExists({
    userId: input.userId,
    kind: input.kind,
    actorId: input.actorId ?? null,
    ratingId: input.ratingId ?? null,
    spotId: input.spotId ?? null,
  });
  if (exists) return false;
  await db.insert(notifications).values({
    id: nanoid(),
    userId: input.userId,
    kind: input.kind,
    actorId: input.actorId ?? null,
    ratingId: input.ratingId ?? null,
    spotId: input.spotId ?? null,
    meta: input.meta ?? null,
    readAt: new Date(),
    createdAt: input.createdAt,
  });
  return true;
}

async function main() {
  const cutoff = new Date(Date.now() - LOOKBACK_MS);
  console.log(`Backfilling notifications since ${cutoff.toISOString()}`);

  // ─── Reactions ──────────────────────────────────────────────
  const recentReactions = await db
    .select({
      id: reactions.id,
      ratingId: reactions.ratingId,
      actorId: reactions.userId,
      kind: reactions.kind,
      createdAt: reactions.createdAt,
      // Resolve the rating's author + spot via subqueries
      reviewerId: ratings.userId,
      spotId: ratings.spotId,
    })
    .from(reactions)
    .innerJoin(ratings, eq(ratings.id, reactions.ratingId))
    .where(gte(reactions.createdAt, cutoff));

  let reactionCount = 0;
  for (const r of recentReactions) {
    const inserted = await insertBackfilled({
      userId: r.reviewerId,
      kind: "reaction",
      actorId: r.actorId,
      ratingId: r.ratingId,
      spotId: r.spotId,
      meta: r.kind,
      createdAt: r.createdAt,
    });
    if (inserted) reactionCount++;
  }
  console.log(`  Reactions backfilled: ${reactionCount}`);

  // ─── Follows ────────────────────────────────────────────────
  const recentFollows = await db
    .select({
      followerId: follows.followerId,
      followingId: follows.followingId,
      createdAt: follows.createdAt,
    })
    .from(follows)
    .where(gte(follows.createdAt, cutoff));

  let followCount = 0;
  for (const f of recentFollows) {
    const inserted = await insertBackfilled({
      userId: f.followingId,
      kind: "new_follower",
      actorId: f.followerId,
      createdAt: f.createdAt,
    });
    if (inserted) followCount++;
  }
  console.log(`  Follows backfilled: ${followCount}`);

  // ─── Follow-user reviews ────────────────────────────────────
  // For each rating in the window, notify every current follower of
  // the reviewer. We use current followers (not historical at the time
  // of the review) since we don't track follow history — close enough
  // for a backfill.
  const recentRatings = await db
    .select({
      id: ratings.id,
      userId: ratings.userId,
      spotId: ratings.spotId,
      createdAt: ratings.createdAt,
    })
    .from(ratings)
    .innerJoin(users, eq(users.id, ratings.userId))
    .where(and(gte(ratings.createdAt, cutoff), isNotNull(users.id)));

  let ratingCount = 0;
  for (const r of recentRatings) {
    const ffs = await db
      .select({ id: follows.followerId })
      .from(follows)
      .where(eq(follows.followingId, r.userId));
    for (const ff of ffs) {
      const inserted = await insertBackfilled({
        userId: ff.id,
        kind: "followed_user_review",
        actorId: r.userId,
        spotId: r.spotId,
        createdAt: r.createdAt,
      });
      if (inserted) ratingCount++;
    }
  }
  console.log(`  Followed-user reviews backfilled: ${ratingCount}`);

  // ─── Initialize badges_earned for users that don't have it set ──
  // (column was just added; otherwise it's NULL).
  const usersForBadgeInit = await db
    .select({ id: users.id, role: users.role, badgesEarned: users.badgesEarned })
    .from(users);
  for (const u of usersForBadgeInit) {
    if (u.badgesEarned != null) continue;
    const ratingsRows = await db
      .select({
        spotId: ratings.spotId,
        isBoysReview: ratings.isBoysReview,
        score: ratings.score,
        spotCity: spots.city,
        spotVenueType: spots.venueType,
      })
      .from(ratings)
      .innerJoin(spots, eq(spots.id, ratings.spotId))
      .where(eq(ratings.userId, u.id));

    const earned = new Set<string>();
    const spotIds = new Set(ratingsRows.map((r) => r.spotId));
    const cities = new Set(ratingsRows.map((r) => r.spotCity).filter(Boolean));
    const venueCounts = new Map<string, number>();
    for (const r of ratingsRows) {
      if (r.spotVenueType)
        venueCounts.set(
          r.spotVenueType,
          (venueCounts.get(r.spotVenueType) ?? 0) + 1
        );
    }
    const states = new Set<string>();
    for (const c of cities) {
      const st = c.split(",")[1]?.trim();
      if (st) states.add(st);
    }
    const tens = ratingsRows.filter((r) => parseFloat(r.score) === 10).length;
    const ones = ratingsRows.filter((r) => parseFloat(r.score) <= 1).length;
    const boysCount = ratingsRows.filter((r) => r.isBoysReview).length;
    const isAdmin = u.role === "admin";

    if (ratingsRows.length >= 1) earned.add("first-cake");
    if (spotIds.size >= 5) earned.add("five-spots");
    if (spotIds.size >= 10) earned.add("ten-spots");
    if (spotIds.size >= 25) earned.add("twenty-five-spots");
    if (cities.size >= 3) earned.add("three-cities");
    if (states.size >= 5) earned.add("five-states");
    if ((venueCounts.get("Country Club") ?? 0) >= 3)
      earned.add("country-club");
    if ((venueCounts.get("Oyster Bar") ?? 0) >= 3) earned.add("oyster");
    if ((venueCounts.get("Hotel") ?? 0) >= 3) earned.add("hotel");
    if (tens >= 1) earned.add("perfect-ten");
    if (ones >= 1) earned.add("harsh-critic");
    if (isAdmin && boysCount >= 5) earned.add("boys-five");

    await db
      .update(users)
      .set({ badgesEarned: Array.from(earned) })
      .where(eq(users.id, u.id));
  }
  console.log(`  Initialized badges_earned for ${usersForBadgeInit.length} users`);

  // ─── Badges ─────────────────────────────────────────────────
  // For each user, look at the badges currently stored on their row.
  // The label table mirrors lib/actions.ts.
  const labelById: Record<string, string> = {
    "first-cake": "First Cake 🥇",
    "five-spots": "Five Spots 🍽️",
    "ten-spots": "Cake Log Started 📒",
    "twenty-five-spots": "Connoisseur 🏆",
    "three-cities": "City Hopper 🏙️",
    "five-states": "Five States 🗺️",
    "country-club": "Country Club Card ⛳️",
    oyster: "Oyster Bar Tour 🦪",
    hotel: "Hotel Hopper 🏨",
    "perfect-ten": "Perfect Ten 💯",
    "harsh-critic": "Harsh Critic 💀",
    "boys-five": "Boys Voice 🦀",
  };
  const allUsers = await db
    .select({ id: users.id, badgesEarned: users.badgesEarned })
    .from(users);

  let badgeCount = 0;
  for (const u of allUsers) {
    const earned = u.badgesEarned ?? [];
    for (const badgeId of earned) {
      const meta = labelById[badgeId] ?? badgeId;
      // Idempotency by meta string — badges don't have their own row
      // reference to disambiguate, so meta carries the badge ID.
      const dup = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, u.id),
            eq(notifications.kind, "badge_earned"),
            eq(notifications.meta, meta)
          )
        )
        .limit(1);
      if (dup.length > 0) continue;
      await db.insert(notifications).values({
        id: nanoid(),
        userId: u.id,
        kind: "badge_earned",
        meta,
        readAt: new Date(),
        // Timestamp these slightly back so they sort below newer events.
        createdAt: new Date(Date.now() - LOOKBACK_MS),
      });
      badgeCount++;
    }
  }
  console.log(`  Badges backfilled: ${badgeCount}`);

  console.log(
    `Done — ${reactionCount + followCount + ratingCount + badgeCount} total`
  );
  // Suppress unused-import lint.
  void spots;
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
