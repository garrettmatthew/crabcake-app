import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { spots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const BASE = "https://crabcakes.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published = await db
    .select({ id: spots.id, createdAt: spots.createdAt })
    .from(spots)
    .where(eq(spots.isPublished, true));

  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/lists`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/saved`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    ...published.map((s) => ({
      url: `${BASE}/spot/${s.id}`,
      lastModified: s.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
