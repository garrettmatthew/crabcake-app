/**
 * One-off script to enrich all spots with Google Places data + Blob photos.
 * Run with: npx tsx scripts/bulk-enrich.ts
 */
import "dotenv/config";
import { db } from "../lib/db";
import { spots } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { enrichFromGoogle } from "../lib/google-places";

async function main() {
  const rows = await db.select().from(spots);
  console.log(`Found ${rows.length} spots`);
  for (const s of rows) {
    process.stdout.write(`${s.name.padEnd(40)} `);
    try {
      const enriched = await enrichFromGoogle(s.id, s.name, s.city);
      if (!enriched) {
        console.log("❌ no match");
        continue;
      }
      await db
        .update(spots)
        .set({
          googlePlaceId: enriched.googlePlaceId,
          address: enriched.address ?? s.address,
          phone: enriched.phone,
          website: enriched.website,
          priceLevel: enriched.priceLevel ?? s.priceLevel,
          photoUrl: enriched.photoUrl ?? s.photoUrl,
          hoursJson: enriched.hoursJson,
          googleRating:
            enriched.googleRating == null ? null : enriched.googleRating.toString(),
          googleRatingCount: enriched.googleRatingCount,
          neighborhood: enriched.neighborhood ?? s.neighborhood,
        })
        .where(eq(spots.id, s.id));
      console.log(
        `✅ ${enriched.googleRating ?? "-"}★ (${enriched.googleRatingCount ?? 0}) ${enriched.photoUrl ? "📸" : ""}`
      );
      await new Promise((r) => setTimeout(r, 400));
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
