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
} from "./db/schema";
import { getCurrentUser, requireUser, requireAdmin } from "./auth";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitRating(input: {
  spotId: string;
  score: number;
  note?: string;
  tags?: string[];
  photoUrl?: string;
  asBoys?: boolean;
}) {
  const user = await requireUser();
  const score = Math.max(0, Math.min(10, input.score));

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
        photoUrl: input.photoUrl ?? existing.photoUrl,
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
      photoUrl: input.photoUrl ?? null,
      isBoysReview: markAsBoys,
    });
  }

  let asBoys = false;
  if (markAsBoys) {
    asBoys = true;
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
}) {
  const user = await requireUser();
  await db
    .update(users)
    .set({
      displayName: input.displayName,
      homeCity: input.homeCity,
      bio: input.bio,
      avatarSwatch: input.avatarSwatch,
    })
    .where(eq(users.id, user.id));
  revalidatePath(`/me`);
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

export async function submitSpot(input: {
  name: string;
  city: string;
  address?: string;
  note?: string;
  latitude?: number;
  longitude?: number;
}) {
  const user = await requireUser();
  await db.insert(submissions).values({
    id: nanoid(),
    userId: user.id,
    name: input.name.trim(),
    city: input.city.trim(),
    address: input.address?.trim() || null,
    note: input.note?.trim() || null,
  });
  revalidatePath("/admin/submissions");
  return { ok: true };
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
