import { notFound } from "next/navigation";
import Link from "next/link";
import { getSpot, listCommunityReviews } from "@/lib/queries";
import { ensureDemoUser } from "@/lib/auth";
import SpotScoreRow from "@/components/SpotScoreRow";
import SpotActions from "@/components/SpotActions";
import ReviewItem from "@/components/ReviewItem";

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
            {spot.neighborhood ? <span className="mx-1.5 opacity-50">·</span> : null}
            {spot.neighborhood}
            <span className="mx-1.5 opacity-50">·</span>
            <span className="text-[var(--green)] font-semibold">Open</span>
            {spot.price ? (
              <>
                <span className="mx-1.5 opacity-50">·</span>
                {spot.price}
              </>
            ) : null}
          </div>

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
              Leave a Review
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
              <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--crab)] font-semibold mb-2">
                THE BALTIMORE BOYS' TAKE
              </div>
              <div
                className="italic text-[15px] leading-[1.45] text-[var(--ink-2)] pl-3"
                style={{ borderLeft: "2px solid var(--crab)" }}
              >
                "{spot.boysReviewQuote}"
              </div>
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
              reviews.map((r) => <ReviewItem key={r.id} review={r} />)
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
