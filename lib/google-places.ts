import { put } from "@vercel/blob";

// Places API (New) base
const PLACES_V1 = "https://places.googleapis.com/v1";

export type EnrichedPlace = {
  googlePlaceId: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  priceLevel: number | null;
  photoUrl: string | null;
  hoursJson: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  neighborhood: string | null;
  venueType: string | null;
};

/**
 * Map Google's primary type tokens to friendly labels.
 * Returns the most relevant non-generic type from a place's types array.
 */
function deriveVenueType(types: string[] | undefined): string | null {
  if (!types || types.length === 0) return null;
  // Priority order — match the most specific/interesting type first
  const priority: Array<[string, string]> = [
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
  for (const [token, label] of priority) {
    if (types.includes(token)) return label;
  }
  return null;
}

type PlacesV1TextResp = {
  places?: Array<{ id: string; displayName?: { text?: string } }>;
};

type PlacesV1Details = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  priceLevel?: string; // e.g. "PRICE_LEVEL_MODERATE"
  photos?: Array<{ name: string }>;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  rating?: number;
  userRatingCount?: number;
  addressComponents?: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
  types?: string[];
  primaryType?: string;
};

function priceLevelToNumber(level: string | undefined): number | null {
  if (!level) return null;
  switch (level) {
    case "PRICE_LEVEL_FREE":
      return 0;
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_MODERATE":
      return 2;
    case "PRICE_LEVEL_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 4;
    default:
      return null;
  }
}

/**
 * Enrich a spot with data from Google Places API (New).
 * Downloads the top photo and uploads to Vercel Blob so the public URL
 * doesn't embed the API key.
 */
export async function enrichFromGoogle(
  spotId: string,
  name: string,
  city: string
): Promise<EnrichedPlace | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY not set");

  // 1. Text Search (POST) — finds the matching place
  const searchRes = await fetch(`${PLACES_V1}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName",
    },
    body: JSON.stringify({
      textQuery: `${name} ${city}`,
      maxResultCount: 1,
    }),
  });
  if (!searchRes.ok) {
    const txt = await searchRes.text();
    throw new Error(`Places search failed: ${searchRes.status} ${txt.slice(0, 200)}`);
  }
  const searchData = (await searchRes.json()) as PlacesV1TextResp;
  const place = searchData.places?.[0];
  if (!place?.id) return null;

  // 2. Place Details (GET) — rich fields
  const fieldMask = [
    "id",
    "displayName",
    "formattedAddress",
    "nationalPhoneNumber",
    "websiteUri",
    "priceLevel",
    "photos",
    "regularOpeningHours",
    "rating",
    "userRatingCount",
    "addressComponents",
    "types",
    "primaryType",
  ].join(",");

  const detailsRes = await fetch(
    `${PLACES_V1}/places/${encodeURIComponent(place.id)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": fieldMask,
      },
    }
  );
  if (!detailsRes.ok) {
    const txt = await detailsRes.text();
    throw new Error(`Place details failed: ${detailsRes.status} ${txt.slice(0, 200)}`);
  }
  const d = (await detailsRes.json()) as PlacesV1Details;

  // 3. Neighborhood from address components
  const comps = d.addressComponents ?? [];
  const neighborhood =
    comps.find((c) => c.types.includes("neighborhood"))?.longText ??
    comps.find((c) => c.types.includes("sublocality_level_1"))?.longText ??
    comps.find((c) => c.types.includes("sublocality"))?.longText ??
    null;

  // 4. Download top photo, upload to Vercel Blob
  let photoUrl: string | null = null;
  const photoName = d.photos?.[0]?.name; // e.g. "places/ChIJ.../photos/ATplDJa..."
  if (photoName) {
    try {
      // Places API (New) photo media endpoint
      const photoMediaUrl = `${PLACES_V1}/${photoName}/media?maxHeightPx=1600&key=${key}`;
      const photoRes = await fetch(photoMediaUrl, { redirect: "follow" });
      if (photoRes.ok) {
        const ct = photoRes.headers.get("content-type") ?? "image/jpeg";
        const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
        const buffer = await photoRes.arrayBuffer();
        const blob = await put(`spots/${spotId}.${ext}`, buffer, {
          access: "public",
          contentType: ct,
          addRandomSuffix: true,
        });
        photoUrl = blob.url;
      } else {
        console.warn(
          `Photo fetch failed for ${spotId}: ${photoRes.status} ${await photoRes.text()}`
        );
      }
    } catch (e) {
      console.warn("Photo download failed for", spotId, e);
    }
  }

  // 5. Hours
  let hoursJson: string | null = null;
  if (d.regularOpeningHours?.weekdayDescriptions) {
    hoursJson = JSON.stringify(d.regularOpeningHours.weekdayDescriptions);
  }

  // Combine primaryType + types for derivation
  const allTypes = [
    ...(d.primaryType ? [d.primaryType] : []),
    ...(d.types ?? []),
  ];

  return {
    googlePlaceId: d.id,
    address: d.formattedAddress ?? null,
    phone: d.nationalPhoneNumber ?? null,
    website: d.websiteUri ?? null,
    priceLevel: priceLevelToNumber(d.priceLevel),
    photoUrl,
    hoursJson,
    googleRating: d.rating ?? null,
    googleRatingCount: d.userRatingCount ?? null,
    neighborhood,
    venueType: deriveVenueType(allTypes),
  };
}
