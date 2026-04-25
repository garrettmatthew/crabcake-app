import Link from "next/link";
import { listSpots, listCollections } from "@/lib/queries";
import { ensureDemoUser } from "@/lib/auth";
import ScoreCircle from "@/components/ScoreCircle";

const GRADIENTS: Record<string, string> = {
  g1: "linear-gradient(135deg, #e83d35, #8a2f1f)",
  g2: "linear-gradient(135deg, #e4b248, #8a6420)",
  g3: "linear-gradient(135deg, #3b5b7d, #1a2b3d)",
  g4: "linear-gradient(135deg, #5a9660, #1f3a22)",
  g5: "linear-gradient(135deg, #8a5aa8, #3d2354)",
  g6: "linear-gradient(135deg, #1a1612, #403a31)",
};

export default async function ListsPage() {
  await ensureDemoUser();
  const spots = await listSpots();
  const collections = await listCollections(true);
  const top5 = spots.slice(0, 5);
  const featured = top5[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-3.5 py-2.5 flex-shrink-0">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-none">
          Lists.
        </h1>
        <div className="text-xs text-[var(--ink-3)] font-medium mt-0.5">
          Top-ranked, curated, and brand new.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-3.5 pt-1">
        {/* Live, momentum-based ranking — refreshed every page load */}
        <Link
          href="/lists/best-this-month"
          className="block rounded-2xl overflow-hidden mb-4 px-4 py-3.5 text-white"
          style={{
            background: "linear-gradient(135deg, var(--crab), var(--gold))",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="text-[28px] flex-shrink-0">🦀</div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[9.5px] tracking-[.12em] uppercase font-bold opacity-90">
                Live · this month
              </div>
              <div className="font-display font-extrabold text-[18px] tracking-tight leading-tight">
                Best of {new Date().toLocaleString("en-US", { month: "long" })}
              </div>
              <div className="text-[11.5px] opacity-90">
                Hottest spots in the last 30 days
              </div>
            </div>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              className="flex-shrink-0"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>

        <div className="font-display font-extrabold text-xl tracking-tight m-1 mb-3 flex justify-between items-baseline">
          Featured
          <span className="text-xs font-semibold text-[var(--crab)]">Top 5 →</span>
        </div>

        {featured && (
          <Link
            href={`/spot/${featured.id}`}
            className="block rounded-3xl overflow-hidden relative h-52 border border-[var(--border)] mb-2.5"
            style={{
              backgroundImage: featured.photoUrl ? `url(${featured.photoUrl})` : undefined,
              background: featured.photoUrl
                ? undefined
                : "linear-gradient(135deg, #c8914a, #4a2a12)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 40%, rgba(26,22,18,.8) 100%)",
              }}
            />
            <div className="absolute top-3.5 right-3.5 z-2">
              <ScoreCircle score={featured.boysScore} size="lg" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-2">
              <span className="inline-block bg-white/20 backdrop-blur px-2 py-1 rounded-md font-mono text-[10px] font-semibold tracking-[.08em] mb-2">
                THE #1 · {featured.city.split(",")[0].toUpperCase()}
              </span>
              <div className="font-display font-extrabold text-[26px] tracking-tight leading-none mb-1">
                {featured.name}
              </div>
              <div className="text-xs opacity-90">
                {featured.neighborhood ?? featured.city}
                {featured.price ? ` · ${featured.price}` : ""}
              </div>
            </div>
          </Link>
        )}

        {top5.slice(1).map((s, i) => (
          <Link
            key={s.id}
            href={`/spot/${s.id}`}
            className="grid gap-3 p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-2xl items-center mb-2"
            style={{ gridTemplateColumns: "auto 48px 1fr auto" }}
          >
            <div className="font-display font-bold text-[22px] tracking-tight text-[var(--ink-3)] w-[26px] text-center">
              {i + 2}
            </div>
            <div
              className="w-12 h-12 rounded-xl bg-cover bg-center"
              style={{
                backgroundImage: s.photoUrl ? `url(${s.photoUrl})` : undefined,
                background: s.photoUrl
                  ? undefined
                  : "linear-gradient(135deg, #e8c185, #6b4024)",
              }}
            />
            <div>
              <div className="font-display font-bold text-sm tracking-tight">{s.name}</div>
              <div className="text-[11.5px] text-[var(--ink-3)] font-medium mt-0.5">
                {s.city}
              </div>
            </div>
            <ScoreCircle score={s.boysScore} size="sm" />
          </Link>
        ))}

        <div className="font-display font-extrabold text-xl tracking-tight m-1 mt-6 mb-3 flex justify-between items-baseline">
          Collections
          <span className="text-xs font-semibold text-[var(--crab)]">
            {collections.length} {collections.length === 1 ? "list" : "lists"}
          </span>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-[var(--ink-3)]">
            No collections yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {collections.map((c) => {
              const cities = c.firstCityList
                ? c.firstCityList
                    .split(",")
                    .map((s) => s.trim().split(",")[0])
                    .filter(Boolean)
                    .slice(0, 3)
                : [];
              return (
                <Link
                  key={c.id}
                  href={`/list/${c.id}`}
                  className="h-32 rounded-2xl relative overflow-hidden block"
                  style={{ background: GRADIENTS[c.gradient] ?? GRADIENTS.g1 }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 40%, rgba(0,0,0,.4) 100%)",
                    }}
                  />
                  <div className="relative z-2 h-full p-3 flex flex-col justify-between text-white">
                    <div
                      className="text-2xl"
                      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.4))" }}
                    >
                      {c.emoji ?? "✦"}
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm tracking-tight leading-[1.1]">
                        {c.title}
                      </div>
                      <div className="font-mono text-[9.5px] opacity-85 font-medium mt-0.5">
                        {c.spotCount} {c.spotCount === 1 ? "spot" : "spots"}
                        {cities.length > 0 ? ` · ${cities.join(", ")}` : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
