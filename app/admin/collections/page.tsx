import Link from "next/link";
import { listCollections } from "@/lib/queries";
import CreateCollectionButton from "@/components/admin/CreateCollectionButton";

const GRADIENTS: Record<string, string> = {
  g1: "linear-gradient(135deg, #e83d35, #8a2f1f)",
  g2: "linear-gradient(135deg, #e4b248, #8a6420)",
  g3: "linear-gradient(135deg, #3b5b7d, #1a2b3d)",
  g4: "linear-gradient(135deg, #5a9660, #1f3a22)",
  g5: "linear-gradient(135deg, #8a5aa8, #3d2354)",
  g6: "linear-gradient(135deg, #1a1612, #403a31)",
};

export default async function AdminCollectionsPage() {
  const collections = await listCollections(false);
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display font-extrabold text-xl tracking-tight">
          Lists ({collections.length})
        </h2>
        <CreateCollectionButton />
      </div>
      {collections.length === 0 ? (
        <div className="text-center py-10 text-sm text-[var(--ink-3)]">
          No lists yet. Create one.
        </div>
      ) : (
        <div className="grid gap-2.5">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/admin/collections/${c.id}`}
              className="h-24 rounded-2xl relative overflow-hidden block"
              style={{ background: GRADIENTS[c.gradient] ?? GRADIENTS.g1 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 40%, rgba(0,0,0,.4) 100%)",
                }}
              />
              <div className="relative z-2 h-full p-3 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{c.emoji ?? "✦"}</div>
                  <div>
                    <div className="font-display font-bold text-[16px] tracking-tight">
                      {c.title}
                      {!c.isPublished && (
                        <span className="ml-2 text-[9px] font-mono uppercase tracking-[.08em] bg-white/25 px-1.5 py-0.5 rounded">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] opacity-80 mt-0.5">
                      {c.spotCount} {c.spotCount === 1 ? "spot" : "spots"}
                    </div>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
