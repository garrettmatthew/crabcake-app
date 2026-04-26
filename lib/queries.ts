import { db } from "./db";
import {
  spots,
  ratings,
  bookmarks,
  submissions,
  users,
  collections,
  collectionSpots,
  tags,
  reactions,
  spotScoreHistory,
  follows,
} from "./db/schema";
import { eq, desc, sql, and, asc, inArray } from "drizzle-orm";
import { getCurrentUser } from "./auth";

export type SpotWithStats = {
  id: string;
  name: string;
  city: string;
  neighborhood: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  priceLevel: number | null;
  photoUrl: string | null;
  establishedYear: string | null;
  boysScore: number | null;
  boysReviewDate: string | null;
  boysReviewPrep: string | null;
  boysReviewQuote: string | null;
  style: string | null;
  prep: string | null;
  filler: string | null;
  size: string | null;
  price: string | null;
  side: string | null;
  phone: string | null;
  website: string | null;
  hoursJson: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  venueType: string | null;
  communityScore: number | null;
  communityCount: number;
  isSaved: boolean;
  userRating: number | null;
  userNote: string | null;
  userTags: string[] | null;
  userPhotoUrl: string | null;
  userPhotoUrls: string[] | null;
  userRatingIsBoys: boolean;
  /** Union of every tag that appears on any rating for this spot. */
  allTags: string[];
  /** Total rating count (Boys + community), used for momentum scoring. */
  ratingCount: number;
  /** Count of ratings created in the last 30 days. */
  recentRatingCount: number;
  /** Rating row ID for the Boys review on this spot, if any. Lets the take
   *  card hang reactions / share off the actual underlying rating. */
  boysRatingId: string | null;
  /** Reaction counts on the Boys rating, populated by getSpot only. */
  boysReactionCounts?: Record<string, number>;
  /** Reactions the current user has on the Boys rating. */
  myBoysReactions?: string[];
};

/** Fetch all published spots with community stats and user state.
 *
 * Same approach as getSpot — fetch raw rows in parallel and aggregate
 * in JS instead of using correlated subqueries inside the spots SELECT.
 * The earlier subquery version was silently returning null aggregates
 * and missing user-rating data on the rate page.
 */
export async function listSpots(): Promise<SpotWithStats[]> {
  const user = await getCurrentUser();

  const [spotRows, allRatings, myBookmarks] = await Promise.all([
    db
      .select()
      .from(spots)
      .where(eq(spots.isPublished, true))
      .orderBy(
        sql`${spots.boysScore} DESC NULLS LAST`,
        sql`${spots.googleRating} DESC NULLS LAST`,
        sql`${spots.googleRatingCount} DESC NULLS LAST`
      ),
    db
      .select({
        spotId: ratings.spotId,
        userId: ratings.userId,
        score: ratings.score,
        note: ratings.note,
        tags: ratings.tags,
        photoUrl: ratings.photoUrl,
        photoUrls: ratings.photoUrls,
        isBoysReview: ratings.isBoysReview,
        createdAt: ratings.createdAt,
      })
      .from(ratings),
    user
      ? db
          .select({ spotId: bookmarks.spotId })
          .from(bookmarks)
          .where(eq(bookmarks.userId, user.id))
      : Promise.resolve([] as Array<{ spotId: string }>),
  ]);

  // Index ratings by spot for O(N+M) aggregation.
  const bySpot = new Map<
    string,
    Array<(typeof allRatings)[number]>
  >();
  for (const r of allRatings) {
    const arr = bySpot.get(r.spotId);
    if (arr) arr.push(r);
    else bySpot.set(r.spotId, [r]);
  }
  const savedSet = new Set(myBookmarks.map((b) => b.spotId));

  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return spotRows.map((row) => {
    const list = bySpot.get(row.id) ?? [];
    const community = list.filter((r) => !r.isBoysReview);
    const communityCount = community.length;
    const communityScore =
      community.length === 0
        ? null
        : (
            community.reduce((s, r) => s + parseFloat(r.score), 0) /
            community.length
          ).toFixed(1);
    const myRating = user ? list.find((r) => r.userId === user.id) : null;
    // Aggregate tags across all ratings on this spot, deduped.
    const tagSet = new Set<string>();
    for (const r of list) {
      if (r.tags) for (const t of r.tags) tagSet.add(t);
    }
    const recentCount = list.filter(
      (r) => new Date(r.createdAt).getTime() >= monthAgo
    ).length;
    return normalizeSpot({
      ...row,
      communityScore,
      communityCount,
      userRating: myRating?.score ?? null,
      userNote: myRating?.note ?? null,
      userTags: myRating?.tags ?? null,
      userPhotoUrl: myRating?.photoUrl ?? null,
      userPhotoUrls: myRating?.photoUrls ?? null,
      userRatingIsBoys: Boolean(myRating?.isBoysReview),
      isSaved: savedSet.has(row.id),
      allTags: Array.from(tagSet),
      ratingCount: list.length,
      recentRatingCount: recentCount,
      boysRatingId: null,
    } as Record<string, unknown>);
  });
}

export async function getSpot(id: string): Promise<SpotWithStats | null> {
  const user = await getCurrentUser();

  // Fetch the spot row, all of its ratings, and (if signed in) the user's
  // bookmark in parallel. Computing the community aggregates in JS here is
  // intentional — earlier we had correlated SQL subqueries inside the spots
  // SELECT, and they were silently returning communityScore=null /
  // communityCount=0 even though the same filter on a separate query
  // returned the right rows. Aggregating client-side after a single ratings
  // fetch is unambiguous and keeps the spot detail page in sync with what
  // listCommunityReviews shows.
  const [spotRow, allRatings, isSavedRow] = await Promise.all([
    db.query.spots.findFirst({
      where: and(eq(spots.id, id), eq(spots.isPublished, true)),
    }),
    db
      .select({
        id: ratings.id,
        userId: ratings.userId,
        score: ratings.score,
        note: ratings.note,
        tags: ratings.tags,
        photoUrl: ratings.photoUrl,
        photoUrls: ratings.photoUrls,
        isBoysReview: ratings.isBoysReview,
      })
      .from(ratings)
      .where(eq(ratings.spotId, id)),
    user
      ? db.query.bookmarks.findFirst({
          where: and(eq(bookmarks.spotId, id), eq(bookmarks.userId, user.id)),
        })
      : Promise.resolve(null),
  ]);

  if (!spotRow) return null;

  // Pull the Boys rating's id + reactions so the take card can host
  // a real ReactionStrip + ShareButton instead of just being read-only.
  const boysRow = allRatings.find((r) => r.isBoysReview);
  let boysReactionCounts: Record<string, number> = {};
  let myBoysReactions: string[] = [];
  if (boysRow) {
    const rxRows = await db
      .select({ kind: reactions.kind, userId: reactions.userId })
      .from(reactions)
      .where(eq(reactions.ratingId, boysRow.id));
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const rx of rxRows) {
      counts[rx.kind] = (counts[rx.kind] ?? 0) + 1;
      if (user && rx.userId === user.id) mine.add(rx.kind);
    }
    boysReactionCounts = counts;
    myBoysReactions = Array.from(mine);
  }

  const community = allRatings.filter((r) => !r.isBoysReview);
  const communityCount = community.length;
  const communityScore =
    community.length === 0
      ? null
      : (
          community.reduce((sum, r) => sum + parseFloat(r.score), 0) /
          community.length
        ).toFixed(1);

  const myRating = user ? allRatings.find((r) => r.userId === user.id) : null;

  const base = normalizeSpot({
    ...spotRow,
    communityScore,
    communityCount,
    userRating: myRating?.score ?? null,
    userNote: myRating?.note ?? null,
    userTags: myRating?.tags ?? null,
    userPhotoUrl: myRating?.photoUrl ?? null,
    userPhotoUrls: myRating?.photoUrls ?? null,
    userRatingIsBoys: Boolean(myRating?.isBoysReview),
    isSaved: Boolean(isSavedRow),
    allTags: [],
    ratingCount: allRatings.length,
    recentRatingCount: 0,
  } as Record<string, unknown>);
  return {
    ...base,
    boysRatingId: boysRow?.id ?? null,
    boysReactionCounts,
    myBoysReactions,
  };
}

function normalizeSpot(row: Record<string, unknown>): SpotWithStats {
  const bs = row.boysScore;
  const cs = row.communityScore;
  const ur = row.userRating;
  const gr = row.googleRating;
  return {
    ...(row as object),
    boysScore: bs == null ? null : parseFloat(bs as string),
    communityScore: cs == null ? null : parseFloat(cs as string),
    userRating: ur == null ? null : parseFloat(ur as string),
    googleRating: gr == null ? null : parseFloat(gr as string),
  } as SpotWithStats;
}

export async function listCommunityReviews(
  spotId: string,
  limit = 12
) {
  const me = await getCurrentUser();
  const reviewRows = await db
    .select({
      id: ratings.id,
      score: ratings.score,
      note: ratings.note,
      tags: ratings.tags,
      photoUrl: ratings.photoUrl,
      photoUrls: ratings.photoUrls,
      createdAt: ratings.createdAt,
      userId: ratings.userId,
      userName: sql<string | null>`(SELECT display_name FROM users WHERE users.id = ${ratings.userId})`,
      avatarSwatch: sql<string | null>`(SELECT avatar_swatch FROM users WHERE users.id = ${ratings.userId})`,
      avatarUrl: sql<string | null>`(SELECT avatar_url FROM users WHERE users.id = ${ratings.userId})`,
    })
    .from(ratings)
    .where(and(eq(ratings.spotId, spotId), eq(ratings.isBoysReview, false)))
    .orderBy(desc(ratings.createdAt))
    .limit(limit);

  const ratingIds = reviewRows.map((r) => r.id);
  const reactionRows =
    ratingIds.length === 0
      ? []
      : await db
          .select({
            ratingId: reactions.ratingId,
            kind: reactions.kind,
            userId: reactions.userId,
          })
          .from(reactions)
          .where(inArray(reactions.ratingId, ratingIds));

  return reviewRows.map((r) => {
    const mine = new Set<string>();
    const counts: Record<string, number> = {};
    for (const rx of reactionRows) {
      if (rx.ratingId !== r.id) continue;
      counts[rx.kind] = (counts[rx.kind] ?? 0) + 1;
      if (me && rx.userId === me.id) mine.add(rx.kind);
    }
    return {
      ...r,
      reactionCounts: counts,
      myReactions: Array.from(mine),
    };
  });
}

export async function listMyRatings() {
  const user = await getCurrentUser();
  if (!user) return [];
  return listRatingsByUser(user.id);
}

/** Boys score changes for a spot, newest first. */
export async function listSpotScoreHistory(spotId: string) {
  return db
    .select({
      id: spotScoreHistory.id,
      previousScore: spotScoreHistory.previousScore,
      newScore: spotScoreHistory.newScore,
      previousQuote: spotScoreHistory.previousQuote,
      newQuote: spotScoreHistory.newQuote,
      kind: spotScoreHistory.kind,
      createdAt: spotScoreHistory.createdAt,
      changedByName: users.displayName,
      changedById: spotScoreHistory.changedBy,
    })
    .from(spotScoreHistory)
    .leftJoin(users, eq(users.id, spotScoreHistory.changedBy))
    .where(eq(spotScoreHistory.spotId, spotId))
    .orderBy(desc(spotScoreHistory.createdAt))
    .limit(20);
}

/** Single rating with spot + reviewer context. Used by /r/[id] share page. */
export async function getRatingById(ratingId: string) {
  const rows = await db
    .select({
      id: ratings.id,
      score: ratings.score,
      note: ratings.note,
      tags: ratings.tags,
      isBoysReview: ratings.isBoysReview,
      photoUrl: ratings.photoUrl,
      photoUrls: ratings.photoUrls,
      createdAt: ratings.createdAt,
      userId: ratings.userId,
      userName: users.displayName,
      avatarSwatch: users.avatarSwatch,
      avatarUrl: users.avatarUrl,
      spotId: spots.id,
      spotName: spots.name,
      spotCity: spots.city,
      spotPhoto: spots.photoUrl,
      spotPublished: spots.isPublished,
    })
    .from(ratings)
    .leftJoin(users, eq(users.id, ratings.userId))
    .leftJoin(spots, eq(spots.id, ratings.spotId))
    .where(eq(ratings.id, ratingId))
    .limit(1);
  return rows[0] ?? null;
}

/** All published ratings authored by a user, joined with spot metadata. */
export async function listRatingsByUser(userId: string) {
  return db
    .select({
      id: ratings.id,
      score: ratings.score,
      note: ratings.note,
      tags: ratings.tags,
      isBoysReview: ratings.isBoysReview,
      photoUrl: ratings.photoUrl,
      photoUrls: ratings.photoUrls,
      createdAt: ratings.createdAt,
      spotId: spots.id,
      spotName: spots.name,
      spotCity: spots.city,
      spotPhoto: spots.photoUrl,
      spotVenueType: spots.venueType,
      boysScore: spots.boysScore,
    })
    .from(ratings)
    .innerJoin(spots, eq(spots.id, ratings.spotId))
    .where(and(eq(ratings.userId, userId), eq(spots.isPublished, true)))
    .orderBy(desc(ratings.createdAt));
}

/** Follower / following counts + whether the current viewer is following. */
export async function getFollowState(targetUserId: string) {
  const me = await getCurrentUser();
  const [followerRows, followingRows] = await Promise.all([
    db
      .select({ id: follows.id })
      .from(follows)
      .where(eq(follows.followingId, targetUserId)),
    db
      .select({ id: follows.id })
      .from(follows)
      .where(eq(follows.followerId, targetUserId)),
  ]);
  let viewerFollows = false;
  if (me && me.id !== targetUserId) {
    const row = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, me.id),
        eq(follows.followingId, targetUserId)
      ),
    });
    viewerFollows = Boolean(row);
  }
  return {
    followerCount: followerRows.length,
    followingCount: followingRows.length,
    viewerFollows,
    canFollow: me != null && me.id !== targetUserId,
  };
}

/**
 * Suggested users to follow. Returns admin (Baltimore Boy) accounts the
 * current viewer doesn't already follow, ordered by activity. Skips the
 * viewer themself.
 */
export async function listSuggestedBoys(viewerId: string | null, limit = 8) {
  // All admin users
  const allAdmins = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      homeCity: users.homeCity,
      avatarSwatch: users.avatarSwatch,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.role, "admin"));

  if (!viewerId) return allAdmins.slice(0, limit);

  // Who I'm already following
  const mine = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, viewerId));
  const followed = new Set(mine.map((m) => m.followingId));
  return allAdmins
    .filter((u) => u.id !== viewerId && !followed.has(u.id))
    .slice(0, limit);
}

/** Users the given user is following — joined with their basic profile. */
export async function listFollowing(userId: string) {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      homeCity: users.homeCity,
      avatarSwatch: users.avatarSwatch,
      avatarUrl: users.avatarUrl,
      role: users.role,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(users, eq(users.id, follows.followingId))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt));
}

/** Public profile fields for a user — only what's safe to expose. */
export async function getUserProfile(userId: string) {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.displayName,
    homeCity: row.homeCity,
    bio: row.bio,
    avatarSwatch: row.avatarSwatch,
    avatarUrl: row.avatarUrl,
    role: row.role,
  };
}

export async function listPendingSubmissions() {
  return db
    .select({
      id: submissions.id,
      name: submissions.name,
      city: submissions.city,
      address: submissions.address,
      note: submissions.note,
      status: submissions.status,
      createdAt: submissions.createdAt,
      userDisplayName: users.displayName,
    })
    .from(submissions)
    .leftJoin(users, eq(users.id, submissions.userId))
    .where(eq(submissions.status, "pending"))
    .orderBy(desc(submissions.createdAt));
}

export async function listAllSpots() {
  return db.select().from(spots).orderBy(desc(spots.boysScore));
}

export async function listCollections(onlyPublished = true) {
  const q = db
    .select({
      id: collections.id,
      title: collections.title,
      description: collections.description,
      emoji: collections.emoji,
      gradient: collections.gradient,
      position: collections.position,
      isPublished: collections.isPublished,
      createdAt: collections.createdAt,
      spotCount: sql<number>`(SELECT COUNT(*)::int FROM ${collectionSpots} WHERE ${collectionSpots.collectionId} = ${collections.id})`,
      firstCityList: sql<string | null>`(
        SELECT string_agg(DISTINCT s.city, ',' ORDER BY s.city)
        FROM ${collectionSpots} cs
        JOIN ${spots} s ON s.id = cs.spot_id
        WHERE cs.collection_id = ${collections.id}
      )`,
    })
    .from(collections)
    .orderBy(asc(collections.position), desc(collections.createdAt));
  if (onlyPublished) return q.where(eq(collections.isPublished, true));
  return q;
}

export async function getCollection(id: string) {
  const rows = await db
    .select()
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  if (!rows[0]) return null;
  return rows[0];
}

export async function listCollectionSpots(collectionId: string) {
  return db
    .select({
      id: spots.id,
      name: spots.name,
      city: spots.city,
      neighborhood: spots.neighborhood,
      photoUrl: spots.photoUrl,
      boysScore: spots.boysScore,
      position: collectionSpots.position,
    })
    .from(collectionSpots)
    .innerJoin(spots, eq(spots.id, collectionSpots.spotId))
    .where(eq(collectionSpots.collectionId, collectionId))
    .orderBy(asc(collectionSpots.position), desc(spots.boysScore));
}

export async function listTags() {
  return db.select().from(tags).orderBy(asc(tags.position), asc(tags.label));
}

export async function listAllUsers() {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      avatarSwatch: users.avatarSwatch,
      createdAt: users.createdAt,
      ratingCount: sql<number>`(SELECT COUNT(*)::int FROM ${ratings} WHERE ${ratings.userId} = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.role), desc(users.createdAt));
}

export async function listMyBookmarks() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db
    .select({
      id: bookmarks.id,
      createdAt: bookmarks.createdAt,
      spotId: spots.id,
      spotName: spots.name,
      spotCity: spots.city,
      spotPhoto: spots.photoUrl,
      boysScore: spots.boysScore,
    })
    .from(bookmarks)
    .innerJoin(spots, eq(spots.id, bookmarks.spotId))
    .where(eq(bookmarks.userId, user.id))
    .orderBy(desc(bookmarks.createdAt));
}
