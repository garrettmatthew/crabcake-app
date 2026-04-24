"use server";

import { db } from "./db";
import { ratings, bookmarks, users, submissions, spots } from "./db/schema";
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
}) {
  const user = await requireUser();
  const score = Math.max(0, Math.min(10, input.score));
  const existing = await db.query.ratings.findFirst({
    where: and(eq(ratings.userId, user.id), eq(ratings.spotId, input.spotId)),
  });
  if (existing) {
    await db
      .update(ratings)
      .set({
        score: score.toFixed(1),
        note: input.note ?? null,
        tags: input.tags ?? null,
        photoUrl: input.photoUrl ?? existing.photoUrl,
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
    });
  }
  revalidatePath(`/spot/${input.spotId}`);
  revalidatePath(`/me`);
  revalidatePath(`/`);
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
