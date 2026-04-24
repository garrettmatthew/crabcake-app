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
} from "./db/schema";
import { eq, desc, sql, and, asc } from "drizzle-orm";
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
  communityScore: number | null;
  communityCount: number;
  isSaved: boolean;
  userRating: number | null;
  userNote: string | null;
  userTags: string[] | null;
};

/** Fetch all published spots with community stats and user state. */
export async function listSpots(): Promise<SpotWithStats[]> {
  const user = await getCurrentUser();

  const rows = await db
    .select({
      id: spots.id,
      name: spots.name,
      city: spots.city,
      neighborhood: spots.neighborhood,
      address: spots.address,
      latitude: spots.latitude,
      longitude: spots.longitude,
      priceLevel: spots.priceLevel,
      photoUrl: spots.photoUrl,
      establishedYear: spots.establishedYear,
      boysScore: spots.boysScore,
      boysReviewDate: spots.boysReviewDate,
      boysReviewPrep: spots.boysReviewPrep,
      boysReviewQuote: spots.boysReviewQuote,
      style: spots.style,
      prep: spots.prep,
      filler: spots.filler,
      size: spots.size,
      price: spots.price,
      side: spots.side,
      phone: spots.phone,
      website: spots.website,
      hoursJson: spots.hoursJson,
      googleRating: spots.googleRating,
      googleRatingCount: spots.googleRatingCount,
      communityScore: sql<string | null>`(
        SELECT ROUND(AVG(score)::numeric, 1)
        FROM ${ratings}
        WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.isBoysReview} = FALSE
      )`,
      communityCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${ratings}
        WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.isBoysReview} = FALSE
      )`,
      userRating: user
        ? sql<string | null>`(
            SELECT score
            FROM ${ratings}
            WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.userId} = ${user.id}
          )`
        : sql<string | null>`NULL`,
      userNote: user
        ? sql<string | null>`(
            SELECT note
            FROM ${ratings}
            WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.userId} = ${user.id}
          )`
        : sql<string | null>`NULL`,
      userTags: user
        ? sql<string[] | null>`(
            SELECT tags
            FROM ${ratings}
            WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.userId} = ${user.id}
          )`
        : sql<string[] | null>`NULL`,
      isSaved: user
        ? sql<boolean>`EXISTS (
            SELECT 1 FROM ${bookmarks}
            WHERE ${bookmarks.spotId} = ${spots.id} AND ${bookmarks.userId} = ${user.id}
          )`
        : sql<boolean>`FALSE`,
    })
    .from(spots)
    .where(eq(spots.isPublished, true))
    .orderBy(desc(spots.boysScore));

  return rows.map(normalizeSpot);
}

export async function getSpot(id: string): Promise<SpotWithStats | null> {
  const user = await getCurrentUser();
  const rows = await db
    .select({
      id: spots.id,
      name: spots.name,
      city: spots.city,
      neighborhood: spots.neighborhood,
      address: spots.address,
      latitude: spots.latitude,
      longitude: spots.longitude,
      priceLevel: spots.priceLevel,
      photoUrl: spots.photoUrl,
      establishedYear: spots.establishedYear,
      boysScore: spots.boysScore,
      boysReviewDate: spots.boysReviewDate,
      boysReviewPrep: spots.boysReviewPrep,
      boysReviewQuote: spots.boysReviewQuote,
      style: spots.style,
      prep: spots.prep,
      filler: spots.filler,
      size: spots.size,
      price: spots.price,
      side: spots.side,
      phone: spots.phone,
      website: spots.website,
      hoursJson: spots.hoursJson,
      googleRating: spots.googleRating,
      googleRatingCount: spots.googleRatingCount,
      communityScore: sql<string | null>`(
        SELECT ROUND(AVG(score)::numeric, 1)
        FROM ${ratings}
        WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.isBoysReview} = FALSE
      )`,
      communityCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${ratings}
        WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.isBoysReview} = FALSE
      )`,
      userRating: user
        ? sql<string | null>`(
            SELECT score
            FROM ${ratings}
            WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.userId} = ${user.id}
          )`
        : sql<string | null>`NULL`,
      userNote: user
        ? sql<string | null>`(
            SELECT note
            FROM ${ratings}
            WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.userId} = ${user.id}
          )`
        : sql<string | null>`NULL`,
      userTags: user
        ? sql<string[] | null>`(
            SELECT tags
            FROM ${ratings}
            WHERE ${ratings.spotId} = ${spots.id} AND ${ratings.userId} = ${user.id}
          )`
        : sql<string[] | null>`NULL`,
      isSaved: user
        ? sql<boolean>`EXISTS (
            SELECT 1 FROM ${bookmarks}
            WHERE ${bookmarks.spotId} = ${spots.id} AND ${bookmarks.userId} = ${user.id}
          )`
        : sql<boolean>`FALSE`,
    })
    .from(spots)
    .where(and(eq(spots.id, id), eq(spots.isPublished, true)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return normalizeSpot(row);
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
  return db
    .select({
      id: ratings.id,
      score: ratings.score,
      note: ratings.note,
      tags: ratings.tags,
      photoUrl: ratings.photoUrl,
      createdAt: ratings.createdAt,
      userId: ratings.userId,
      userName: sql<string | null>`(SELECT display_name FROM users WHERE users.id = ${ratings.userId})`,
      avatarSwatch: sql<string | null>`(SELECT avatar_swatch FROM users WHERE users.id = ${ratings.userId})`,
    })
    .from(ratings)
    .where(and(eq(ratings.spotId, spotId), eq(ratings.isBoysReview, false)))
    .orderBy(desc(ratings.createdAt))
    .limit(limit);
}

export async function listMyRatings() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db
    .select({
      id: ratings.id,
      score: ratings.score,
      note: ratings.note,
      tags: ratings.tags,
      createdAt: ratings.createdAt,
      spotId: spots.id,
      spotName: spots.name,
      spotCity: spots.city,
      spotPhoto: spots.photoUrl,
      boysScore: spots.boysScore,
    })
    .from(ratings)
    .innerJoin(spots, eq(spots.id, ratings.spotId))
    .where(eq(ratings.userId, user.id))
    .orderBy(desc(ratings.createdAt));
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
