import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Google Places search for any signed-in user.
 * Returns places matching the query string. Used by the Add-a-spot flow.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ places: [] });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ places: [] });

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount,places.primaryType,places.types",
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: 8 }),
  });

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: txt.slice(0, 200) }, { status: res.status });
  }
  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      photos?: Array<{ name: string }>;
      primaryType?: string;
      types?: string[];
    }>;
  };
  const places = (data.places ?? []).map((p) => {
    // Friendly type label
    const types = [...(p.primaryType ? [p.primaryType] : []), ...(p.types ?? [])];
    let venueType: string | null = null;
    const map: Array<[string, string]> = [
      ["country_club", "Country Club"],
      ["seafood_restaurant", "Seafood"],
      ["oyster_bar", "Oyster Bar"],
      ["fine_dining_restaurant", "Fine Dining"],
      ["pub", "Pub"],
      ["bar_and_grill", "Bar & Grill"],
      ["bar", "Bar"],
      ["catering", "Catering"],
      ["hotel", "Hotel"],
      ["club", "Club"],
      ["restaurant", "Restaurant"],
      ["cafe", "Cafe"],
    ];
    for (const [k, v] of map) {
      if (types.includes(k)) {
        venueType = v;
        break;
      }
    }
    return {
      placeId: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? null,
      photoName: p.photos?.[0]?.name ?? null,
      venueType,
    };
  });
  return NextResponse.json({ places });
}
