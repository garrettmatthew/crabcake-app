"use server";

import { db } from "./db";
import {
  ratings,
  bookmarks,
  users,
  submissions,
  spots,
  collections,
  collectionSpots,
  tags,
  reports,
  reactions,
  spotScoreHistory,
  follows,
} from "./db/schema";
import { getCurrentUser, requireUser, requireAdmin } from "./auth";
import { and, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitRating(input: {
  spotId: string;
  score: number;
  note?: string;
  tags?: string[];
  /** New multi-photo array. */
  photoUrls?: string[];
  /** Legacy single-photo input — still accepted from older callers. */
  photoUrl?: string;
  asBoys?: boolean;
}) {
  const user = await requireUser();
  const score = Math.max(0, Math.min(10, input.score));

  // Normalize photo input. New callers pass photoUrls (array). Legacy
  // single-photo callers pass photoUrl. Internally we always write to
  // photoUrls; photoUrl gets the first entry for backward-compat reads.
  const incomingPhotos =
    input.photoUrls ??
    (input.photoUrl ? [input.photoUrl] : undefined);

  // Always record the personal rating so it shows up in "My reviews"
  const existing = await db.query.ratings.findFirst({
    where: and(eq(ratings.userId, user.id), eq(ratings.spotId, input.spotId)),
  });
  const markAsBoys = Boolean(input.asBoys && user.role === "admin");
  if (existing) {
    await db
      .update(ratings)
      .set({
        score: score.toFixed(1),
        note: input.note ?? null,
        tags: input.tags ?? null,
        photoUrl: incomingPhotos?.[0] ?? existing.photoUrl,
        photoUrls:
          incomingPhotos !== undefined
            ? incomingPhotos.length > 0
              ? incomingPhotos
              : null
            : existing.photoUrls,
        isBoysReview: markAsBoys,
        updatedAt: new Date(),
      })
      .where(eq(ratings.id, existing.id));
  } else {
    await db.insert(ratings).values({
      id: nanoid(),
      userId: user.id,
      spotId: input.spotId,
      score: score.toFixed(1),
      note: input.note ?? null,
      tags: input.tags ?? null,
      photoUrl: incomingPhotos?.[0] ?? null,
      photoUrls: incomingPhotos && incomingPhotos.length > 0 ? incomingPhotos : null,
      isBoysReview: markAsBoys,
    });
  }

  let asBoys = false;
  if (markAsBoys) {
    asBoys = true;
    // Only one Boys review per spot. Clear is_boys_review on every other
    // rating for this spot so an admin reposting doesn't leave the
    // previous author's rating flagged.
    await db
      .update(ratings)
      .set({ isBoysReview: false })
      .where(
        and(
          eq(ratings.spotId, input.spotId),
          ne(ratings.userId, user.id)
        )
      );
    // Derive prep from tags if present
    const tagSet = new Set(input.tags ?? []);
    const prep = tagSet.has("Broiled")
      ? "Broiled"
      : tagSet.has("Fried")
        ? "Fried"
        : null;
    // Derive style from tags
    const style = tagSet.has("Jumbo Lump")
      ? "Jumbo Lump"
      : tagSet.has("Lump")
        ? "Lump"
        : tagSet.has("Imperial")
          ? "Imperial"
          : null;
    const filler = tagSet.has("Minimal Filler")
      ? "Minimal"
      : tagSet.has("Heavy Filler")
        ? "Heavy"
        : null;

    // Capture the previous Boys snapshot so we can record a history row.
    const prevSpot = await db.query.spots.findFirst({
      where: eq(spots.id, input.spotId),
    });

    await db
      .update(spots)
      .set({
        boysScore: score.toFixed(1),
        boysReviewQuote: input.note ?? null,
        boysReviewPrep: prep ?? undefined,
        boysReviewDate: new Date().toISOString().slice(0, 10),
        // Only overwrite these spec fields if admin actually picked a matching tag
        prep: prep ?? undefined,
        style: style ?? undefined,
        filler: filler ?? undefined,
        photoUrl: input.photoUrl ?? undefined,
      })
      .where(eq(spots.id, input.spotId));

    // Append history row if anything actually changed.
    const prevScore = prevSpot?.boysScore ?? null;
    const prevQuote = prevSpot?.boysReviewQuote ?? null;
    const newScoreStr = score.toFixed(1);
    if (prevScore !== newScoreStr || prevQuote !== (input.note ?? null)) {
      await db.insert(spotScoreHistory).values({
        id: nanoid(),
        spotId: input.spotId,
        changedBy: user.id,
        previousScore: prevScore,
        newScore: newScoreStr,
        previousQuote: prevQuote,
        newQuote: input.note ?? null,
        kind: prevScore == null ? "added" : "updated",
      });
    }
    revalidatePath("/lists");
  }

  revalidatePath(`/spot/${input.spotId}`);
  revalidatePath(`/me`);
  revalidatePath(`/`);
  return { ok: true, asBoys };
}

/**
 * Delete the current user's rating for a spot. If the rating was the
 * official Boys review, also clear the spot's boys_* aggregate fields so
 * the score circle drops back to "—" instead of showing the orphaned
 * value.
 */
export async function deleteRating(spotId: string) {
  const user = await requireUser();
  const existing = await db.query.ratings.findFirst({
    where: and(eq(ratings.userId, user.id), eq(ratings.spotId, spotId)),
  });
  if (!existing) return { ok: true, deleted: false };

  await db.delete(ratings).where(eq(ratings.id, existing.id));

  if (existing.isBoysReview) {
    await db
      .update(spots)
      .set({
        boysScore: null,
        boysReviewQuote: null,
        boysReviewPrep: null,
        boysReviewDate: null,
      })
      .where(eq(spots.id, spotId));
    revalidatePath("/lists");
  }

  revalidatePath(`/spot/${spotId}`);
  revalidatePath(`/me`);
  revalidatePath(`/`);
  return { ok: true, deleted: true };
}

/**
 * Delete the official Boys review for a spot. Admin-only. Works
 * regardless of which Boy authored it — the Boys collectively own the
 * score, so any of them can clear it. Removes the rating row and
 * clears the spot's boys_* fields.
 */
export async function deleteBoysReviewForSpot(spotId: string) {
  const user = await requireAdmin();
  const prevSpot = await db.query.spots.findFirst({
    where: eq(spots.id, spotId),
  });
  const existing = await db.query.ratings.findFirst({
    where: and(eq(ratings.spotId, spotId), eq(ratings.isBoysReview, true)),
  });
  if (existing) {
    await db.delete(ratings).where(eq(ratings.id, existing.id));
  }
  await db
    .update(spots)
    .set({
      boysScore: null,
      boysReviewQuote: null,
      boysReviewPrep: null,
      boysReviewDate: null,
    })
    .where(eq(spots.id, spotId));

  if (prevSpot?.boysScore != null) {
    await db.insert(spotScoreHistory).values({
      id: nanoid(),
      spotId,
      changedBy: user.id,
      previousScore: prevSpot.boysScore,
      newScore: null,
      previousQuote: prevSpot.boysReviewQuote ?? null,
      newQuote: null,
      kind: "removed",
    });
  }

  revalidatePath(`/spot/${spotId}`);
  revalidatePath("/lists");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleBookmark(spotId: string) {
  const user = await requireUser();
  const existing = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, user.id), eq(bookmarks.spotId, spotId)),
  });
  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
    revalidatePath(`/spot/${spotId}`);
    revalidatePath(`/saved`);
    revalidatePath(`/`);
    return { bookmarked: false };
  }
  await db.insert(bookmarks).values({
    id: nanoid(),
    userId: user.id,
    spotId,
  });
  revalidatePath(`/spot/${spotId}`);
  revalidatePath(`/saved`);
  revalidatePath(`/`);
  return { bookmarked: true };
}

export async function updateProfile(input: {
  displayName: string;
  homeCity: string;
  bio: string;
  avatarSwatch: string;
  avatarUrl?: string | null;
}) {
  const user = await requireUser();
  await db
    .update(users)
    .set({
      displayName: input.displayName,
      homeCity: input.homeCity,
      bio: input.bio,
      avatarSwatch: input.avatarSwatch,
      avatarUrl: input.avatarUrl ?? null,
    })
    .where(eq(users.id, user.id));
  revalidatePath(`/me`);
  return { ok: true };
}

/**
 * Follow / unfollow another user. Idempotent — calling twice with the
 * same target toggles. Returns the resulting state so the UI can update
 * without a second roundtrip.
 */
export async function toggleFollow(targetUserId: string) {
  const user = await requireUser();
  if (user.id === targetUserId) {
    throw new Error("You can't follow yourself");
  }
  const existing = await db.query.follows.findFirst({
    where: and(
      eq(follows.followerId, user.id),
      eq(follows.followingId, targetUserId)
    ),
  });
  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
    revalidatePath(`/u/${targetUserId}`);
    revalidatePath(`/me`);
    return { ok: true, following: false };
  }
  await db.insert(follows).values({
    id: nanoid(),
    followerId: user.id,
    followingId: targetUserId,
  });
  revalidatePath(`/u/${targetUserId}`);
  revalidatePath(`/me`);
  return { ok: true, following: true };
}

const REACTION_KINDS = new Set(["crab", "fire", "skull"]);

/**
 * Toggle a reaction (crab / fire / skull) on a review. Adds it if the
 * user hasn't reacted with that kind yet, removes it if they have.
 * Returns the resulting boolean so the client can flip its UI without
 * a second roundtrip.
 */
export async function toggleReaction(input: {
  ratingId: string;
  kind: string;
}) {
  const user = await requireUser();
  if (!REACTION_KINDS.has(input.kind)) {
    throw new Error("Unknown reaction");
  }
  const existing = await db.query.reactions.findFirst({
    where: and(
      eq(reactions.ratingId, input.ratingId),
      eq(reactions.userId, user.id),
      eq(reactions.kind, input.kind)
    ),
  });
  if (existing) {
    await db.delete(reactions).where(eq(reactions.id, existing.id));
    return { ok: true, reacted: false };
  }
  await db.insert(reactions).values({
    id: nanoid(),
    ratingId: input.ratingId,
    userId: user.id,
    kind: input.kind,
  });
  return { ok: true, reacted: true };
}

/**
 * User flags a spot. Auth required so we can credit the reporter.
 * Reasons are short tokens — the UI maps them to friendly labels.
 */
export async function reportSpot(input: {
  spotId: string;
  reason: string;
  note?: string;
}) {
  const user = await requireUser();
  const reason = input.reason.trim().slice(0, 40);
  if (!reason) throw new Error("Reason required");
  await db.insert(reports).values({
    id: nanoid(),
    spotId: input.spotId,
    userId: user.id,
    reason,
    note: input.note?.slice(0, 500) ?? null,
    status: "pending",
  });
  revalidatePath("/admin/reports");
  return { ok: true };
}

/** Dismiss a report without doing anything to the spot. */
export async function dismissReport(reportId: string) {
  await requireAdmin();
  await db
    .update(reports)
    .set({ status: "dismissed" })
    .where(eq(reports.id, reportId));
  revalidatePath("/admin/reports");
  return { ok: true };
}

/**
 * Admin: unpublish a spot (hide from map and lists). Used in response to a
 * report. Marks any pending reports for that spot as actioned.
 */
export async function unpublishSpot(spotId: string) {
  await requireAdmin();
  await db.update(spots).set({ isPublished: false }).where(eq(spots.id, spotId));
  await db
    .update(reports)
    .set({ status: "actioned" })
    .where(and(eq(reports.spotId, spotId), eq(reports.status, "pending")));
  revalidatePath("/admin/reports");
  revalidatePath("/admin/spots");
  revalidatePath("/");
  return { ok: true };
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "spot"
  );
}

/**
 * Manual spot submission — used when Google Places doesn't list a venue
 * (private clubs, brand-new openings, pop-ups). Auto-publishes the spot
 * by trying, in order:
 *   1. Google Places searchText("name address city") — for places Google
 *      knows about under a slightly different name.
 *   2. Google Geocoding on (address + city) — works for any street even
 *      if no business is registered there.
 *   3. Google Geocoding on (city) — falls back to the city's centroid.
 * If all three fail, throws.
 */
export async function submitSpot(input: {
  name: string;
  city: string;
  address?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
}) {
  const user = await requireUser();
  const name = input.name.trim();
  const city = input.city.trim();
  const address = input.address?.trim() || null;
  if (!name || !city) throw new Error("Name and city required");

  // 1. Geocode if caller didn't already pass coordinates.
  let lat = input.latitude;
  let lng = input.longitude;
  let resolvedAddress: string | null = address;
  let neighborhood: string | null = null;

  if (lat == null || lng == null) {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new Error("GOOGLE_PLACES_API_KEY not set");

    // Try Places search first
    try {
      const q = [name, address, city].filter(Boolean).join(" ");
      const r = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask":
              "places.location,places.formattedAddress,places.addressComponents",
          },
          body: JSON.stringify({
            textQuery: q,
            maxResultCount: 1,
            regionCode: "us",
          }),
        }
      );
      if (r.ok) {
        const data = (await r.json()) as {
          places?: Array<{
            location?: { latitude?: number; longitude?: number };
            formattedAddress?: string;
            addressComponents?: Array<{ longText: string; types: string[] }>;
          }>;
        };
        const p = data.places?.[0];
        if (p?.location?.latitude != null && p?.location?.longitude != null) {
          lat = p.location.latitude;
          lng = p.location.longitude;
          resolvedAddress = resolvedAddress ?? p.formattedAddress ?? null;
          const nb = p.addressComponents?.find((c) =>
            c.types.includes("neighborhood")
          )?.longText;
          if (nb) neighborhood = nb;
        }
      }
    } catch {
      /* fall through to geocoding */
    }

    // Fall back to Geocoding API on address+city, then city alone
    if (lat == null || lng == null) {
      const queries = [
        address ? `${address}, ${city}` : null,
        city,
      ].filter(Boolean) as string[];
      for (const q of queries) {
        try {
          const r = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}`
          );
          if (!r.ok) continue;
          const data = (await r.json()) as {
            results?: Array<{
              geometry?: { location?: { lat?: number; lng?: number } };
              formatted_address?: string;
            }>;
            status?: string;
          };
          const loc = data.results?.[0]?.geometry?.location;
          if (loc?.lat != null && loc?.lng != null) {
            lat = loc.lat;
            lng = loc.lng;
            resolvedAddress =
              resolvedAddress ?? data.results?.[0]?.formatted_address ?? null;
            break;
          }
        } catch {
          /* try the next query */
        }
      }
    }
  }

  if (lat == null || lng == null) {
    throw new Error(
      "Couldn't locate that spot. Double-check the city and try again."
    );
  }

  // 2. Generate a unique slug.
  let base = slugify(name);
  let candidate = base;
  let i = 2;
  while (await db.query.spots.findFirst({ where: eq(spots.id, candidate) })) {
    candidate = `${base}-${i++}`;
  }

  // 3. Insert the spot directly — published, attributed to this user.
  await db.insert(spots).values({
    id: candidate,
    name,
    city,
    neighborhood,
    address: resolvedAddress,
    latitude: lat,
    longitude: lng,
    isPublished: true,
    createdBy: user.id,
  });

  // 4. If the user typed a note, also persist it as their first rating's
  //    note? — skip; the manual form doesn't ask for a score, so a note
  //    without a rating would be orphaned. The note is stored on the
  //    submissions table for any future audit.
  await db.insert(submissions).values({
    id: nanoid(),
    userId: user.id,
    name,
    city,
    address: resolvedAddress,
    note: input.note?.trim() || null,
    status: "approved",
  });

  revalidatePath("/");
  revalidatePath("/admin/spots");
  return { ok: true, spotId: candidate };
}

export async function approveSubmission(
  submissionId: string,
  details: { latitude: number; longitude: number; photoUrl?: string; neighborhood?: string }
) {
  await requireAdmin();
  const sub = await db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!sub) throw new Error("Submission not found");
  if (sub.status !== "pending") throw new Error("Already processed");

  // Generate a unique slug
  let base = slugify(sub.name);
  let candidate = base;
  let i = 2;
  while (await db.query.spots.findFirst({ where: eq(spots.id, candidate) })) {
    candidate = `${base}-${i++}`;
  }

  await db.insert(spots).values({
    id: candidate,
    name: sub.name,
    city: sub.city,
    neighborhood: details.neighborhood ?? null,
    address: sub.address,
    latitude: details.latitude,
    longitude: details.longitude,
    photoUrl: details.photoUrl ?? null,
    isPublished: true,
  });
  await db
    .update(submissions)
    .set({ status: "approved" })
    .where(eq(submissions.id, submissionId));

  revalidatePath("/admin/submissions");
  revalidatePath("/");
  return { ok: true, spotId: candidate };
}

export async function rejectSubmission(submissionId: string) {
  await requireAdmin();
  await db
    .update(submissions)
    .set({ status: "rejected" })
    .where(eq(submissions.id, submissionId));
  revalidatePath("/admin/submissions");
  return { ok: true };
}

export async function createCollection(input: {
  title: string;
  description?: string;
  emoji?: string;
  gradient?: string;
}) {
  const user = await requireAdmin();
  const id = nanoid(10);
  await db.insert(collections).values({
    id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    emoji: input.emoji?.trim() || null,
    gradient: input.gradient ?? "g1",
    createdBy: user.id,
  });
  revalidatePath("/lists");
  revalidatePath("/admin/collections");
  return { ok: true, id };
}

export async function updateCollection(
  id: string,
  input: {
    title?: string;
    description?: string;
    emoji?: string;
    gradient?: string;
    isPublished?: boolean;
  }
) {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined)
    patch.description = input.description?.trim() || null;
  if (input.emoji !== undefined) patch.emoji = input.emoji?.trim() || null;
  if (input.gradient !== undefined) patch.gradient = input.gradient;
  if (input.isPublished !== undefined) patch.isPublished = input.isPublished;
  await db.update(collections).set(patch).where(eq(collections.id, id));
  revalidatePath("/lists");
  revalidatePath(`/list/${id}`);
  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}`);
  return { ok: true };
}

export async function deleteCollection(id: string) {
  await requireAdmin();
  await db.delete(collections).where(eq(collections.id, id));
  revalidatePath("/lists");
  revalidatePath("/admin/collections");
  return { ok: true };
}

export async function addSpotToCollection(collectionId: string, spotId: string) {
  await requireAdmin();
  try {
    await db.insert(collectionSpots).values({ collectionId, spotId });
  } catch {
    // Already exists — ignore (PK violation)
  }
  revalidatePath(`/list/${collectionId}`);
  revalidatePath(`/admin/collections/${collectionId}`);
  return { ok: true };
}

export async function removeSpotFromCollection(
  collectionId: string,
  spotId: string
) {
  await requireAdmin();
  await db
    .delete(collectionSpots)
    .where(
      and(
        eq(collectionSpots.collectionId, collectionId),
        eq(collectionSpots.spotId, spotId)
      )
    );
  revalidatePath(`/list/${collectionId}`);
  revalidatePath(`/admin/collections/${collectionId}`);
  return { ok: true };
}

export async function createTag(label: string) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label required");
  const id = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!id) throw new Error("Invalid label");
  try {
    await db.insert(tags).values({ id, label: trimmed });
  } catch {
    throw new Error("Tag already exists");
  }
  revalidatePath("/admin/tags");
  revalidatePath("/rate");
  return { ok: true, id };
}

export async function deleteTag(id: string) {
  await requireAdmin();
  await db.delete(tags).where(eq(tags.id, id));
  revalidatePath("/admin/tags");
  revalidatePath("/rate");
  return { ok: true };
}

export async function setUserRole(userId: string, role: "user" | "admin") {
  await requireAdmin();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}

function slugifyShort(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "spot"
  );
}

/**
 * Add a spot directly from a Google Places ID.
 * Available to any signed-in user. Publishes immediately.
 */
export async function addSpotByPlaceId(placeId: string) {
  const user = await requireUser();
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY not set");

  // Check if we already have this place
  const existing = await db.query.spots.findFirst({
    where: eq(spots.googlePlaceId, placeId),
  });
  if (existing) {
    revalidatePath("/");
    revalidatePath("/admin/spots");
    return { ok: true, spotId: existing.id, alreadyExisted: true };
  }

  const detailsRes = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,location,addressComponents",
      },
    }
  );
  if (!detailsRes.ok) {
    const txt = await detailsRes.text();
    throw new Error(`Details lookup failed: ${detailsRes.status} ${txt.slice(0, 200)}`);
  }
  const d = (await detailsRes.json()) as {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    addressComponents?: Array<{
      longText: string;
      shortText: string;
      types: string[];
    }>;
  };

  const name = d.displayName?.text;
  const lat = d.location?.latitude;
  const lng = d.location?.longitude;
  if (!name || lat == null || lng == null) {
    throw new Error("Missing required fields from Google");
  }

  const comps = d.addressComponents ?? [];
  const cityName =
    comps.find((c) => c.types.includes("locality"))?.longText ??
    comps.find((c) => c.types.includes("postal_town"))?.longText ??
    "";
  const stateAbbr =
    comps.find((c) => c.types.includes("administrative_area_level_1"))?.shortText ?? "";
  const city = [cityName, stateAbbr].filter(Boolean).join(", ");

  // Generate unique slug
  let base = slugifyShort(name);
  let candidate = base;
  let i = 2;
  while (await db.query.spots.findFirst({ where: eq(spots.id, candidate) })) {
    candidate = `${base}-${i++}`;
  }

  await db.insert(spots).values({
    id: candidate,
    name,
    city: city || "Unknown",
    address: d.formattedAddress ?? null,
    latitude: lat,
    longitude: lng,
    googlePlaceId: d.id,
    isPublished: true,
    createdBy: user.id,
  });

  // Immediately enrich with photo + phone + hours + venue type
  try {
    const { enrichFromGoogle } = await import("./google-places");
    const enriched = await enrichFromGoogle(candidate, name, city);
    if (enriched) {
      await db
        .update(spots)
        .set({
          googlePlaceId: enriched.googlePlaceId,
          address: enriched.address ?? d.formattedAddress ?? null,
          phone: enriched.phone,
          website: enriched.website,
          priceLevel: enriched.priceLevel,
          photoUrl: enriched.photoUrl,
          hoursJson: enriched.hoursJson,
          googleRating:
            enriched.googleRating == null ? null : enriched.googleRating.toString(),
          googleRatingCount: enriched.googleRatingCount,
          neighborhood: enriched.neighborhood,
          venueType: enriched.venueType,
        })
        .where(eq(spots.id, candidate));
    }
  } catch (e) {
    console.warn("Enrichment after add failed", e);
  }

  revalidatePath("/");
  revalidatePath("/admin/spots");
  return { ok: true, spotId: candidate };
}

// Backward-compat alias used by existing admin form
export const adminAddSpotByPlaceId = addSpotByPlaceId;

export async function enrichSpotFromGoogle(spotId: string) {
  await requireAdmin();
  const spot = await db.query.spots.findFirst({ where: eq(spots.id, spotId) });
  if (!spot) throw new Error("Spot not found");
  const { enrichFromGoogle } = await import("./google-places");
  const enriched = await enrichFromGoogle(spot.id, spot.name, spot.city);
  if (!enriched) return { ok: false, reason: "No Google match" };
  await db
    .update(spots)
    .set({
      googlePlaceId: enriched.googlePlaceId,
      address: enriched.address ?? spot.address,
      phone: enriched.phone,
      website: enriched.website,
      priceLevel: enriched.priceLevel ?? spot.priceLevel,
      photoUrl: enriched.photoUrl ?? spot.photoUrl,
      hoursJson: enriched.hoursJson,
      googleRating: enriched.googleRating == null ? null : enriched.googleRating.toString(),
      googleRatingCount: enriched.googleRatingCount,
      neighborhood: enriched.neighborhood ?? spot.neighborhood,
    })
    .where(eq(spots.id, spotId));
  revalidatePath(`/admin/spots/${spotId}`);
  revalidatePath(`/spot/${spotId}`);
  revalidatePath("/");
  return { ok: true, enriched };
}

export async function enrichAllSpotsFromGoogle() {
  await requireAdmin();
  const allSpots = await db.select().from(spots);
  const results: Array<{ id: string; name: string; ok: boolean; reason?: string }> = [];
  for (const spot of allSpots) {
    try {
      const { enrichFromGoogle } = await import("./google-places");
      const enriched = await enrichFromGoogle(spot.id, spot.name, spot.city);
      if (!enriched) {
        results.push({ id: spot.id, name: spot.name, ok: false, reason: "No match" });
        continue;
      }
      await db
        .update(spots)
        .set({
          googlePlaceId: enriched.googlePlaceId,
          address: enriched.address ?? spot.address,
          phone: enriched.phone,
          website: enriched.website,
          priceLevel: enriched.priceLevel ?? spot.priceLevel,
          photoUrl: enriched.photoUrl ?? spot.photoUrl,
          hoursJson: enriched.hoursJson,
          googleRating:
            enriched.googleRating == null ? null : enriched.googleRating.toString(),
          googleRatingCount: enriched.googleRatingCount,
          neighborhood: enriched.neighborhood ?? spot.neighborhood,
          venueType: enriched.venueType ?? spot.venueType,
        })
        .where(eq(spots.id, spot.id));
      results.push({ id: spot.id, name: spot.name, ok: true });
      // brief pause to respect rate limits
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      results.push({
        id: spot.id,
        name: spot.name,
        ok: false,
        reason: e instanceof Error ? e.message : "error",
      });
    }
  }
  revalidatePath("/admin/spots");
  revalidatePath("/");
  return { ok: true, results };
}

export async function postBoysReview(input: {
  spotId: string;
  score: number;
  quote: string;
  prep: string;
  style?: string;
  filler?: string;
  size?: string;
  price?: string;
  side?: string;
  establishedYear?: string;
  photoUrl?: string;
}) {
  await requireAdmin();
  const score = Math.max(0, Math.min(10, input.score));
  await db
    .update(spots)
    .set({
      boysScore: score.toFixed(1),
      boysReviewQuote: input.quote,
      boysReviewPrep: input.prep,
      boysReviewDate: new Date().toISOString().slice(0, 10),
      style: input.style ?? undefined,
      filler: input.filler ?? undefined,
      size: input.size ?? undefined,
      price: input.price ?? undefined,
      side: input.side ?? undefined,
      prep: input.prep,
      establishedYear: input.establishedYear ?? undefined,
      photoUrl: input.photoUrl ?? undefined,
    })
    .where(eq(spots.id, input.spotId));
  revalidatePath(`/spot/${input.spotId}`);
  revalidatePath("/");
  revalidatePath("/lists");
  return { ok: true };
}
