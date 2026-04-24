import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spots } from "@/lib/db/schema";
import { or, ilike, desc, eq, and } from "drizzle-orm";

export const runtime = "nodejs";

type SpotResult = {
  kind: "spot";
  id: string;
  name: string;
  city: string;
  photoUrl: string | null;
  boysScore: number | null;
};

type PlaceResult = {
  kind: "place";
  placeId: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  displayName: string;
};

/**
 * Search the DB for existing spots + Nominatim (OpenStreetMap) for new places.
 * No API key required. Respects Nominatim usage policy by setting a UA header.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ spots: [], places: [] });

  // Spots from our DB — match name, city, neighborhood, or address
  const dbRows = await db
    .select({
      id: spots.id,
      name: spots.name,
      city: spots.city,
      photoUrl: spots.photoUrl,
      boysScore: spots.boysScore,
    })
    .from(spots)
    .where(
      and(
        eq(spots.isPublished, true),
        or(
          ilike(spots.name, `%${q}%`),
          ilike(spots.city, `%${q}%`),
          ilike(spots.neighborhood, `%${q}%`),
          ilike(spots.address, `%${q}%`)
        )
      )
    )
    .orderBy(desc(spots.boysScore))
    .limit(6);

  const spotResults: SpotResult[] = dbRows.map((r) => ({
    kind: "spot",
    id: r.id,
    name: r.name,
    city: r.city,
    photoUrl: r.photoUrl,
    boysScore: r.boysScore == null ? null : parseFloat(r.boysScore as string),
  }));

  // Nominatim for places — only query if user looks like they typed a place name,
  // not just a city we already have. Limit to US for now.
  let placeResults: PlaceResult[] = [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&countrycodes=us&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Crabcake App (https://crabcakes.app)",
        "Accept-Language": "en",
      },
      next: { revalidate: 60 * 60 },
    });
    if (r.ok) {
      const places = (await r.json()) as Array<{
        place_id: number;
        lat: string;
        lon: string;
        display_name: string;
        name?: string;
        address?: { city?: string; town?: string; village?: string; state?: string };
      }>;
      placeResults = places
        .filter((p) => p.name && p.name.trim().length > 0)
        .map((p) => ({
          kind: "place" as const,
          placeId: String(p.place_id),
          name: p.name!,
          city: [p.address?.city ?? p.address?.town ?? p.address?.village, p.address?.state]
            .filter(Boolean)
            .join(", "),
          latitude: parseFloat(p.lat),
          longitude: parseFloat(p.lon),
          displayName: p.display_name,
        }))
        .slice(0, 5);
    }
  } catch {
    // Ignore network errors — DB results still return
  }

  return NextResponse.json({ spots: spotResults, places: placeResults });
}
