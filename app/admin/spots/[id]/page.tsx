import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { spots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BoysReviewForm from "@/components/admin/BoysReviewForm";

export default async function EditSpotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
  const spot = rows[0];
  if (!spot) notFound();
  return (
    <BoysReviewForm
      spot={{
        id: spot.id,
        name: spot.name,
        city: spot.city,
        photoUrl: spot.photoUrl,
        boysScore: spot.boysScore == null ? null : parseFloat(spot.boysScore as string),
        boysReviewQuote: spot.boysReviewQuote,
        boysReviewPrep: spot.boysReviewPrep,
        style: spot.style,
        filler: spot.filler,
        size: spot.size,
        price: spot.price,
        side: spot.side,
        establishedYear: spot.establishedYear,
      }}
    />
  );
}
