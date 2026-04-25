import { notFound } from "next/navigation";
import Link from "next/link";
import { getSpot, listCommunityReviews } from "@/lib/queries";
import { ensureDemoUser } from "@/lib/auth";
import SpotScoreRow from "@/components/SpotScoreRow";
import SpotActions from "@/components/SpotActions";
import ReviewItem from "@/components/ReviewItem";
import BoysTakeControls from "@/components/BoysTakeControls";
import { getCurrentUser } from "@/lib/auth";

// Score circle was rendering stale (showing "—" / "0 reviews") when a fresh
// rating had just been written. Force dynamic + revalidate=0 so Next never
// holds a cached server render of this route.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SpotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await ensureDemoUser();
  const spot = await getSpot(id);
  if (!spot) notFound();
  const reviews = await listCommunityReviews(id, 12);
  const me = await getCurrentUser();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Yellow header */}
      <div
        className="px-3 py-2.5 grid gap-2 items-center z-30 flex-shrink-0"
        style={{
          gridTemplateColumns: "36px 1fr 36px 36px",
          background: "var(--gold)",
          color: "var(--ink)",
        }}
      >
        <Link
          href="/"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(26,22,18,.12)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display font-extrabold text-[15.5px] tracking-tight text-center m-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {spot.name}
        </h1>
        <SpotActions spotId={spot.id} isSaved={spot.isSaved} />
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "calc(var(--tab-h, 64px) + 24px)" }}>
        {/* Hero */}
        <div
          className="h-60 relative bg-cover bg-center"
          style={{
            backgroundImage: spot.photoUrl
              ? `url(${spot.photoUrl})`
              : "linear-gradient(135deg, #c8914a, #4a2a12)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(26,22,18,.25) 0%, transparent 30%, transparent 60%, rgba(26,22,18,.5) 100%)",
            }}
          />
        </div>

        <div className="px-4 pt-5">
          <div className="font-mono text-[10px] tracking-[.08em] uppercase text-[var(--crab)] font-semibold mb-1.5">
            {spot.establishedYear ? `EST. ${spot.establishedYear}` : "ENTRY"}
          </div>
          <h2 className="font-display font-extrabold text-[28px] tracking-tight leading-none m-0 mb-1.5">
            {spot.name}
          </h2>
          <div className="text-[13.5px] text-[var(--ink-3)] font-medium mb-4">
            {spot.city}
            {spot.neighborhood ? (
              <>
                <span className="mx-1.5 opacity-50">·</span>
                {spot.neighborhood}
              </>
            ) : null}
            {spot.price ? (
              <>
                <span className="mx-1.5 opacity-50">·</span>
                {spot.price}
              </>
            ) : null}
          </div>

          {/* Contact row — phone / website / Google rating */}
          {(spot.phone || spot.website || spot.googleRating != null) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {spot.phone && (
                <a
                  href={`tel:${spot.phone.replace(/\s/g, "")}`}
                  className="h-9 px-3 rounded-full bg-[var(--panel)] border border-[var(--border)] inline-flex items-center gap-1.5 text-[12.5px] font-semibold"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  {spot.phone}
                </a>
              )}
              {spot.website && (
                <a
                  href={spot.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3 rounded-full bg-[var(--panel)] border border-[var(--border)] inline-flex items-center gap-1.5 text-[12.5px] font-semibold"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                  </svg>
                  Website
                </a>
              )}
              {spot.googleRating != null && (
                <span className="h-9 px-3 rounded-full bg-[var(--panel)] border border-[var(--border)] inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#fbbc04">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {spot.googleRating.toFixed(1)}
                  {spot.googleRatingCount != null && (
                    <span className="text-[var(--ink-3)] font-medium">
                      ({spot.googleRatingCount.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
            </div>
          )}

          {/* Hours dropdown */}
          {spot.hoursJson && (
            <details className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl px-4 py-3 mb-3.5">
              <summary className="font-display font-bold text-[14px] tracking-tight cursor-pointer flex justify-between items-center list-none">
                Hours
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="mt-2 space-y-1 text-[12.5px] text-[var(--ink-2)]">
                {(() => {
                  try {
                    const hrs = JSON.parse(spot.hoursJson) as string[];
                    return hrs.map((h) => <div key={h}>{h}</div>);
                  } catch {
                    return null;
                  }
                })()}
              </div>
            </details>
          )}

          <SpotScoreRow
            spotId={spot.id}
            boysScore={spot.boysScore}
            communityScore={spot.communityScore}
            communityCount={spot.communityCount}
            boysPrep={spot.boysReviewPrep}
          />

          <div className="flex flex-col gap-2.5 mb-5 mt-1">
            <Link
              href={`/rate?spot=${spot.id}`}
              className="h-[58px] rounded-full font-extrabold text-[16px] flex items-center justify-center gap-2 text-[var(--ink)] tracking-tight"
              style={{
                background: "var(--gold)",
                boxShadow: "0 4px 14px -4px rgba(228,178,72,.5)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {spot.userRating != null && !spot.userRatingIsBoys
                ? "Update your review"
                : "Leave a Review"}
            </Link>

            {spot.address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  spot.address
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-[58px] rounded-full font-extrabold text-[16px] flex items-center justify-center gap-2 text-white tracking-tight"
                style={{
                  background: "var(--crab)",
                  boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <path d="M9 11a3 3 0 106 0 3 3 0 00-6 0z" />
                  <path d="M12 2a8 8 0 018 8c0 5-8 14-8 14S4 15 4 10a8 8 0 018-8z" />
                </svg>
                Get Directions
              </a>
            ) : null}
          </div>

          {/* Anatomy card */}
          {(spot.style || spot.prep || spot.filler || spot.size || spot.price || spot.side) && (
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl px-4 py-3.5 mb-3.5">
              <h4 className="font-display font-bold text-[15px] tracking-tight m-0 mb-2.5 flex justify-between items-baseline">
                Crab cake anatomy
                <span className="font-mono text-[9.5px] tracking-[.06em] text-[var(--ink-3)] font-medium uppercase">
                  SPEC
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {spot.style && <AnaItem label="Style" value={spot.style} />}
                {spot.prep && <AnaItem label="Prep" value={spot.prep} />}
                {spot.filler && <AnaItem label="Filler" value={spot.filler} />}
                {spot.size && <AnaItem label="Size" value={spot.size} />}
                {spot.price && <AnaItem label="Price" value={spot.price} />}
                {spot.side && <AnaItem label="Side" value={spot.side} />}
              </div>
            </div>
          )}

          {/* Boys quote */}
          {spot.boysReviewQuote && (
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl px-4 py-4 mb-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--crab)] font-semibold">
                  THE BALTIMORE BOYS' TAKE
                </div>
                {spot.userRatingIsBoys && (
                  <BoysTakeControls
                    spotId={spot.id}
                    boysScore={spot.boysScore}
                  />
                )}
              </div>
              <div
                className="italic text-[15px] leading-[1.45] text-[var(--ink-2)] pl-3"
                style={{ borderLeft: "2px solid var(--crab)" }}
              >
                "{spot.boysReviewQuote}"
              </div>
              {spot.boysScore != null && (
                <div className="font-mono text-[10px] tracking-[.06em] text-[var(--ink-3)] mt-2 pl-3">
                  Boys score · {spot.boysScore.toFixed(1)}
                </div>
              )}
            </div>
          )}

          {/* Community reviews */}
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl px-4 py-3.5 mb-4">
            <h4 className="font-display font-bold text-[15px] tracking-tight m-0 mb-2.5 flex justify-between items-baseline">
              Community
              <span className="text-[10.5px] text-[var(--ink-3)] font-medium">
                {spot.communityCount} · avg {spot.communityScore?.toFixed(1) ?? "—"}
              </span>
            </h4>
            {reviews.length === 0 ? (
              <div className="py-4 text-center text-[13px] text-[var(--ink-3)]">
                No community reviews yet. Be the first.
              </div>
            ) : (
              reviews.map((r) => (
                <ReviewItem
                  key={r.id}
                  review={r}
                  spotId={spot.id}
                  currentUserId={me?.id ?? null}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-0.5">
        {label}
      </div>
      <div className="font-display font-bold text-[13.5px] tracking-tight">{value}</div>
    </div>
  );
}
