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
  street: string | null; // "1804 Callowhill St" or neighborhood fallback
  venueType: string | null; // friendly label e.g. "Restaurant", "Cafe"
  isFood: boolean;
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
  // not just a city we already have. Limit to US for now. Pull more than we
  // need so we can sort food-serving venues first and still keep variety.
  let placeResults: PlaceResult[] = [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2` +
      `&countrycodes=us&limit=15&addressdetails=1&extratags=1&q=${encodeURIComponent(q)}`;
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
        category?: string; // e.g. "amenity", "shop", "tourism"
        type?: string; // e.g. "restaurant", "cafe", "bar"
        address?: {
          house_number?: string;
          road?: string;
          neighbourhood?: string;
          suburb?: string;
          city?: string;
          town?: string;
          village?: string;
          state?: string;
        };
      }>;

      // Friendly label for known OSM types — null if we don't have a mapping.
      const labelFor = (cat?: string, type?: string): string | null => {
        if (!type) return null;
        const map: Record<string, string> = {
          restaurant: "Restaurant",
          cafe: "Cafe",
          fast_food: "Fast Food",
          bar: "Bar",
          pub: "Pub",
          biergarten: "Beer Garden",
          food_court: "Food Court",
          ice_cream: "Ice Cream",
          bakery: "Bakery",
          deli: "Deli",
          butcher: "Butcher",
          seafood: "Seafood",
          hotel: "Hotel",
          motel: "Motel",
          guest_house: "Inn",
          golf_course: "Golf Club",
        };
        if (map[type]) return map[type];
        // Fall back to titlecasing the category if it's at least informative.
        if (cat && cat !== "amenity") {
          return cat.charAt(0).toUpperCase() + cat.slice(1);
        }
        return null;
      };

      // Things that almost certainly serve food. Prioritized in sort.
      const FOOD_TYPES = new Set([
        "restaurant", "cafe", "fast_food", "bar", "pub", "biergarten",
        "food_court", "ice_cream", "bakery", "deli", "seafood",
        // Hotels/inns commonly have restaurants — borderline but include
        "hotel", "guest_house", "golf_course",
      ]);

      placeResults = places
        .filter((p) => p.name && p.name.trim().length > 0)
        .map((p) => {
          const a = p.address ?? {};
          const street =
            [a.house_number, a.road].filter(Boolean).join(" ") ||
            a.neighbourhood ||
            a.suburb ||
            null;
          const isFood = FOOD_TYPES.has(p.type ?? "");
          return {
            kind: "place" as const,
            placeId: String(p.place_id),
            name: p.name!,
            city: [a.city ?? a.town ?? a.village, a.state]
              .filter(Boolean)
              .join(", "),
            street,
            venueType: labelFor(p.category, p.type),
            isFood,
            latitude: parseFloat(p.lat),
            longitude: parseFloat(p.lon),
            displayName: p.display_name,
          };
        })
        // Food-serving venues first, but don't drop non-food entirely
        .sort((a, b) => Number(b.isFood) - Number(a.isFood))
        .slice(0, 6);
    }
  } catch {
    // Ignore network errors — DB results still return
  }

  return NextResponse.json({ spots: spotResults, places: placeResults });
}
