import { put } from "@vercel/blob";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

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
};

/**
 * Enrich a spot with data from Google Places API.
 * Downloads the top photo and uploads to Vercel Blob so the public URL
 * doesn't contain the API key.
 */
export async function enrichFromGoogle(
  spotId: string,
  name: string,
  city: string
): Promise<EnrichedPlace | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY not set");

  // 1. Text Search to find the place
  const query = `${name} ${city}`;
  const searchUrl = `${PLACES_BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${key}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`Places search failed: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const place = searchData.results?.[0];
  if (!place?.place_id) return null;

  // 2. Place Details for rich fields
  const fields = [
    "place_id",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "price_level",
    "photos",
    "opening_hours",
    "rating",
    "user_ratings_total",
    "address_components",
  ].join(",");
  const detailsUrl = `${PLACES_BASE}/details/json?place_id=${place.place_id}&fields=${fields}&key=${key}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) throw new Error(`Places details failed: ${detailsRes.status}`);
  const detailsData = await detailsRes.json();
  const d = detailsData.result;
  if (!d) return null;

  // 3. Neighborhood from address_components
  type Comp = { types: string[]; long_name: string };
  const neighborhoodComp =
    (d.address_components as Comp[] | undefined)?.find((c) =>
      c.types.includes("neighborhood")
    ) ??
    (d.address_components as Comp[] | undefined)?.find((c) =>
      c.types.includes("sublocality")
    );
  const neighborhood = neighborhoodComp?.long_name ?? null;

  // 4. Download top photo, upload to Vercel Blob
  let photoUrl: string | null = null;
  const photoRef = d.photos?.[0]?.photo_reference as string | undefined;
  if (photoRef) {
    try {
      const photoEndpoint =
        `${PLACES_BASE}/photo?maxwidth=1600&photoreference=${photoRef}&key=${key}`;
      const photoRes = await fetch(photoEndpoint, { redirect: "follow" });
      if (photoRes.ok) {
        const ct = photoRes.headers.get("content-type") ?? "image/jpeg";
        const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
        const buffer = await photoRes.arrayBuffer();
        const blob = await put(`spots/${spotId}.${ext}`, buffer, {
          access: "public",
          contentType: ct,
          addRandomSuffix: true, // so repeat enrichments don't collide
        });
        photoUrl = blob.url;
      }
    } catch (e) {
      console.warn("Photo download failed for", spotId, e);
    }
  }

  // 5. Hours — serialize weekday_text as simple JSON
  let hoursJson: string | null = null;
  if (d.opening_hours?.weekday_text) {
    hoursJson = JSON.stringify(d.opening_hours.weekday_text);
  }

  return {
    googlePlaceId: place.place_id,
    address: d.formatted_address ?? null,
    phone: d.formatted_phone_number ?? null,
    website: d.website ?? null,
    priceLevel: d.price_level ?? null,
    photoUrl,
    hoursJson,
    googleRating: d.rating ?? null,
    googleRatingCount: d.user_ratings_total ?? null,
    neighborhood,
  };
}
