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
 * Search the DB for existing spots + Google Places for new places.
 * Google handles fuzzy spelling ("sabrinas" → "Sabrina's") and proper venue
 * categorization (no highways or random non-food). Falls back to no places
 * if the API key isn't set. Cached 5 min via fetch revalidate.
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

  // Google Places for "Add a new spot" suggestions. Same engine as /submit, so
  // results are consistent — and Google never returns highways or roads. We
  // pull 10 then sort food types first.
  //
  // Two important params for quality:
  //   - regionCode: "us" — keeps results in the US so a search for "sabrinas"
  //     doesn't return a bakery in Mexico.
  //   - includedType: "restaurant" + strictTypeFiltering: false — biases the
  //     ranking toward food spots without excluding country clubs/hotels.
  //
  // cache:"force-cache" is required for POST fetches to actually use the
  // `revalidate` window (default for POSTs is no cache).
  let placeResults: PlaceResult[] = [];
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (key) {
    try {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.primaryType,places.types,places.addressComponents",
        },
        body: JSON.stringify({
          textQuery: q,
          maxResultCount: 10,
          regionCode: "us",
        }),
        cache: "force-cache",
        next: { revalidate: 60 * 5 }, // 5-min cache to keep API costs predictable
      });
      if (r.ok) {
        const data = (await r.json()) as {
          places?: Array<{
            id: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            shortFormattedAddress?: string;
            location?: { latitude?: number; longitude?: number };
            primaryType?: string;
            types?: string[];
            addressComponents?: Array<{
              longText: string;
              shortText: string;
              types: string[];
            }>;
          }>;
        };

        // Friendly label for the most-specific recognized Google type.
        const labelMap: Array<[string, string]> = [
          ["country_club", "Country Club"],
          ["seafood_restaurant", "Seafood"],
          ["oyster_bar", "Oyster Bar"],
          ["fine_dining_restaurant", "Fine Dining"],
          ["steak_house", "Steakhouse"],
          ["sports_bar", "Sports Bar"],
          ["pub", "Pub"],
          ["bar_and_grill", "Bar & Grill"],
          ["wine_bar", "Wine Bar"],
          ["bar", "Bar"],
          ["coffee_shop", "Coffee"],
          ["cafe", "Cafe"],
          ["bakery", "Bakery"],
          ["deli", "Deli"],
          ["fast_food_restaurant", "Fast Food"],
          ["diner", "Diner"],
          ["catering", "Catering"],
          ["hotel", "Hotel"],
          ["resort_hotel", "Resort"],
          ["inn", "Inn"],
          ["banquet_hall", "Banquet Hall"],
          ["golf_course", "Golf Club"],
          ["club", "Club"],
          ["restaurant", "Restaurant"],
        ];
        const FOOD_TYPES = new Set(labelMap.map(([k]) => k).concat([
          "food", "meal_takeaway", "meal_delivery", "food_court", "food_hall",
        ]));

        placeResults = (data.places ?? [])
          .filter((p) => p.displayName?.text)
          .map((p) => {
            const allTypes = [
              ...(p.primaryType ? [p.primaryType] : []),
              ...(p.types ?? []),
            ];
            const isFood = allTypes.some((t) => FOOD_TYPES.has(t));
            let venueType: string | null = null;
            for (const [k, v] of labelMap) {
              if (allTypes.includes(k)) {
                venueType = v;
                break;
              }
            }

            // Pull street ("123 Main St") from the formatted address — first
            // segment up to the first comma. Google's formattedAddress is
            // consistently "<street>, <city>, <state> <zip>, <country>".
            const fullAddr = p.formattedAddress ?? "";
            const firstComma = fullAddr.indexOf(",");
            const street = firstComma > 0 ? fullAddr.slice(0, firstComma) : null;

            // Locality + state for the secondary line.
            const comps = p.addressComponents ?? [];
            const cityName =
              comps.find((c) => c.types.includes("locality"))?.longText ??
              comps.find((c) => c.types.includes("postal_town"))?.longText ??
              comps.find((c) => c.types.includes("sublocality"))?.longText ??
              "";
            const stateAbbr =
              comps.find((c) => c.types.includes("administrative_area_level_1"))
                ?.shortText ?? "";
            const city = [cityName, stateAbbr].filter(Boolean).join(", ");

            return {
              kind: "place" as const,
              placeId: p.id,
              name: p.displayName!.text!,
              city,
              street,
              venueType,
              isFood,
              latitude: p.location?.latitude ?? 0,
              longitude: p.location?.longitude ?? 0,
              displayName: fullAddr,
            };
          })
          // Food first, but keep everything — country clubs, hotels, etc. still show
          .sort((a, b) => Number(b.isFood) - Number(a.isFood))
          .slice(0, 6);
      }
    } catch {
      // Ignore network errors — DB results still return
    }
  }

  return NextResponse.json({ spots: spotResults, places: placeResults });
}
