"use server";

import { db } from "./db";
import { ratings, bookmarks, users } from "./db/schema";
import { getCurrentUser, requireUser } from "./auth";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitRating(input: {
  spotId: string;
  score: number;
  note?: string;
  tags?: string[];
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
