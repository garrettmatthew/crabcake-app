import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        "places.id,places.displayName,places.formattedAddress,places.photos,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: q,
      maxResultCount: 6,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json(
      { error: txt.slice(0, 200) },
      { status: res.status }
    );
  }
  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      photos?: Array<{ name: string }>;
    }>;
  };
  const places = (data.places ?? []).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? null,
    photoName: p.photos?.[0]?.name ?? null,
  }));
  return NextResponse.json({ places });
}
