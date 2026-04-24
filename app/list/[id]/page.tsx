import { notFound } from "next/navigation";
import Link from "next/link";
import { getCollection, listCollectionSpots } from "@/lib/queries";
import ScoreCircle from "@/components/ScoreCircle";

const GRADIENTS: Record<string, string> = {
  g1: "linear-gradient(135deg, #e83d35, #8a2f1f)",
  g2: "linear-gradient(135deg, #e4b248, #8a6420)",
  g3: "linear-gradient(135deg, #3b5b7d, #1a2b3d)",
  g4: "linear-gradient(135deg, #5a9660, #1f3a22)",
  g5: "linear-gradient(135deg, #8a5aa8, #3d2354)",
  g6: "linear-gradient(135deg, #1a1612, #403a31)",
};

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection || !collection.isPublished) notFound();
  const spots = await listCollectionSpots(id);

  const gradient = GRADIENTS[collection.gradient] ?? GRADIENTS.g1;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Gradient hero */}
      <div
        className="h-48 relative flex-shrink-0"
        style={{ background: gradient }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.4) 100%)",
          }}
        />
        <div className="relative z-2 h-full px-4 py-3 flex flex-col text-white">
          <div className="flex items-center justify-between">
            <Link
              href="/lists"
              className="w-9 h-9 rounded-full bg-white/25 backdrop-blur flex items-center justify-center"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <div
              className="text-2xl"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.4))" }}
            >
              {collection.emoji ?? "✦"}
            </div>
          </div>
          <div className="mt-auto">
            <div className="font-display font-extrabold text-[34px] tracking-tight leading-none">
              {collection.title}
            </div>
            <div className="text-sm opacity-90 mt-1 max-w-[80%]">
              {collection.description}
            </div>
            <div className="font-mono text-[10px] opacity-75 tracking-[.08em] uppercase mt-2">
              {spots.length} {spots.length === 1 ? "spot" : "spots"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-3.5 pt-3">
        {spots.length === 0 ? (
          <div className="text-center py-10 text-[13.5px] text-[var(--ink-3)]">
            No spots in this list yet.
          </div>
        ) : (
          spots.map((s, i) => {
            const boys = s.boysScore == null ? null : parseFloat(s.boysScore as string);
            return (
              <Link
                key={s.id}
                href={`/spot/${s.id}`}
                className="grid gap-3 p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-2xl items-center mb-2"
                style={{ gridTemplateColumns: "auto 56px 1fr auto" }}
              >
                <div className="font-display font-bold text-[22px] tracking-tight text-[var(--ink-3)] w-[26px] text-center">
                  {i + 1}
                </div>
                <div
                  className="w-14 h-14 rounded-xl bg-cover bg-center"
                  style={{
                    backgroundImage: s.photoUrl ? `url(${s.photoUrl})` : undefined,
                    background: s.photoUrl
                      ? undefined
                      : "linear-gradient(135deg, #e8c185, #6b4024)",
                  }}
                />
                <div>
                  <div className="font-display font-bold text-[14.5px] tracking-tight">
                    {s.name}
                  </div>
                  <div className="text-[11.5px] text-[var(--ink-3)] font-medium mt-0.5">
                    {s.city}
                    {s.neighborhood ? ` · ${s.neighborhood}` : ""}
                  </div>
                </div>
                <ScoreCircle score={boys} size="sm" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
