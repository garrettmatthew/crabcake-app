import Link from "next/link";
import { listSpots } from "@/lib/queries";
import { ensureDemoUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BestThisMonthPage() {
  await ensureDemoUser();
  const spots = await listSpots();

  // Score each spot by recent momentum: spots with multiple recent
  // ratings rank highest, weighted by score, gated by needing at least
  // one rating in the last 30 days. Falls back to Boys score, then
  // Google rating.
  const ranked = spots
    .filter((s) => s.recentRatingCount > 0)
    .map((s) => {
      const score =
        s.boysScore != null
          ? s.boysScore
          : s.communityScore != null
            ? s.communityScore
            : s.googleRating != null
              ? s.googleRating * 2
              : 5;
      // Simple momentum: recent count * average score / 10. Tunable.
      const momentum = s.recentRatingCount * (score / 10);
      return { spot: s, momentum, score };
    })
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 20);

  const monthName = new Date().toLocaleString("en-US", { month: "long" });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-3 flex items-center gap-2 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href="/lists"
          className="w-9 h-9 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display font-extrabold text-[18px] tracking-tight">
          Best of {monthName}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div
          className="rounded-2xl p-4 mb-4 text-white"
          style={{
            background: "linear-gradient(135deg, var(--crab), var(--gold))",
          }}
        >
          <div className="font-mono text-[10px] tracking-[.12em] uppercase font-bold mb-1 opacity-90">
            Live ranking
          </div>
          <h2 className="font-display font-extrabold text-[28px] tracking-tight leading-none mb-1.5">
            Best of {monthName}
          </h2>
          <p className="text-[13px] leading-[1.45] opacity-95">
            Spots with the most action in the last 30 days, weighted by score.
            Rebuilt every page load.
          </p>
        </div>

        {ranked.length === 0 ? (
          <div className="text-center py-16 text-[13px] text-[var(--ink-3)]">
            No reviews in the last 30 days yet. Be the first.
          </div>
        ) : (
          <div className="space-y-2">
            {ranked.map(({ spot, score }, i) => (
              <Link
                key={spot.id}
                href={`/spot/${spot.id}`}
                className="flex items-center gap-3 bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-2.5"
              >
                <div
                  className="font-display font-extrabold text-[20px] tracking-tight w-7 text-center flex-shrink-0"
                  style={{ color: "var(--ink-3)" }}
                >
                  {i + 1}
                </div>
                <div
                  className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0"
                  style={{
                    backgroundImage: spot.photoUrl
                      ? `url(${spot.photoUrl})`
                      : "linear-gradient(135deg, #e8c185, #6b4024)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[15px] tracking-tight truncate">
                    {spot.name}
                  </div>
                  <div className="text-[11.5px] text-[var(--ink-3)] font-medium">
                    {spot.city}
                    {spot.venueType ? ` · ${spot.venueType}` : ""}
                  </div>
                  <div className="text-[10.5px] font-mono text-[var(--ink-3)] mt-0.5">
                    {spot.recentRatingCount}{" "}
                    {spot.recentRatingCount === 1 ? "review" : "reviews"} this
                    month
                  </div>
                </div>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-display font-extrabold text-[14.5px] text-white flex-shrink-0"
                  style={
                    score >= 9
                      ? { background: "var(--gold)", color: "var(--ink)" }
                      : score >= 8
                        ? { background: "var(--crab)" }
                        : score >= 7
                          ? { background: "#c98551" }
                          : { background: "var(--ink-3)" }
                  }
                >
                  {score.toFixed(1)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
