/**
 * Backfill venue_type for spots that already have a google_place_id.
 * Cheap — only fetches the types/primaryType field, no photo redownload.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-venue-type.ts
 */
import "dotenv/config";
import { db } from "../lib/db";
import { spots } from "../lib/db/schema";
import { and, isNull, isNotNull, eq } from "drizzle-orm";

const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) {
  console.error("GOOGLE_PLACES_API_KEY not set");
  process.exit(1);
}

const PRIORITY: Array<[string, string]> = [
  ["country_club", "Country Club"],
  ["golf_course", "Golf Club"],
  ["seafood_restaurant", "Seafood"],
  ["oyster_bar", "Oyster Bar"],
  ["fish_market", "Fish Market"],
  ["fine_dining_restaurant", "Fine Dining"],
  ["steak_house", "Steakhouse"],
  ["pub", "Pub"],
  ["bar_and_grill", "Bar & Grill"],
  ["sports_bar", "Sports Bar"],
  ["bar", "Bar"],
  ["diner", "Diner"],
  ["fast_food_restaurant", "Fast Food"],
  ["catering", "Catering"],
  ["caterer", "Caterer"],
  ["food_court", "Food Court"],
  ["food_hall", "Food Hall"],
  ["market", "Market"],
  ["hotel", "Hotel"],
  ["inn", "Inn"],
  ["resort_hotel", "Resort"],
  ["club", "Club"],
  ["banquet_hall", "Banquet Hall"],
  ["restaurant", "Restaurant"],
  ["cafe", "Cafe"],
];

function deriveVenueType(types: string[]): string | null {
  for (const [token, label] of PRIORITY) {
    if (types.includes(token)) return label;
  }
  return null;
}

async function main() {
  const rows = await db
    .select({ id: spots.id, name: spots.name, googlePlaceId: spots.googlePlaceId })
    .from(spots)
    .where(and(isNotNull(spots.googlePlaceId), isNull(spots.venueType)));

  console.log(`Backfilling ${rows.length} spots`);

  for (const s of rows) {
    if (!s.googlePlaceId) continue;
    process.stdout.write(`${s.name.padEnd(40)} `);
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(s.googlePlaceId)}`,
        {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": KEY!,
            "X-Goog-FieldMask": "id,types,primaryType",
          },
        }
      );
      if (!res.ok) {
        console.log(`💥 ${res.status}`);
        continue;
      }
      const d = (await res.json()) as { primaryType?: string; types?: string[] };
      const allTypes = [
        ...(d.primaryType ? [d.primaryType] : []),
        ...(d.types ?? []),
      ];
      const venueType = deriveVenueType(allTypes);
      if (!venueType) {
        console.log(`— no match (${allTypes.slice(0, 3).join(", ")})`);
        continue;
      }
      await db.update(spots).set({ venueType }).where(eq(spots.id, s.id));
      console.log(`✅ ${venueType}`);
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      console.log(`💥 ${e instanceof Error ? e.message : "error"}`);
    }
  }
  console.log("Done");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
