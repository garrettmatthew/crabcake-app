import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { listAllSpots, listCollectionSpots } from "@/lib/queries";
import AdminCollectionEditor from "@/components/admin/AdminCollectionEditor";

export default async function AdminCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  const collection = rows[0];
  if (!collection) notFound();
  const [allSpots, spotsInList] = await Promise.all([
    listAllSpots(),
    listCollectionSpots(id),
  ]);
  const memberIds = new Set(spotsInList.map((s) => s.id));
  return (
    <AdminCollectionEditor
      collection={{
        id: collection.id,
        title: collection.title,
        description: collection.description,
        emoji: collection.emoji,
        gradient: collection.gradient,
        isPublished: collection.isPublished,
      }}
      allSpots={allSpots.map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city,
        photoUrl: s.photoUrl,
      }))}
      memberIds={Array.from(memberIds)}
    />
  );
}
