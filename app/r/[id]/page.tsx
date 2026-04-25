import { notFound } from "next/navigation";
import Link from "next/link";
import { getRatingById } from "@/lib/queries";
import PhotoLightbox from "@/components/PhotoLightbox";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getRatingById(id);
  if (!r) return {};
  const score = parseFloat(r.score).toFixed(1);
  const who = r.userName ?? "A Baltimore local";
  const label = r.isBoysReview ? "Official Boys take" : "Community take";
  return {
    title: `${who} on ${r.spotName} — ${score}/10`,
    description: r.note
      ? `"${r.note.slice(0, 160)}"`
      : `${label} on Crabcakes.`,
    openGraph: {
      title: `${who} on ${r.spotName} — ${score}/10`,
      description: r.note ?? label,
      url: `https://crabcakes.app/r/${id}`,
    },
  };
}

export default async function RatingSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getRatingById(id);
  if (!r || !r.spotPublished) notFound();

  const score = parseFloat(r.score);
  const dateStr = new Date(r.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const initials = (r.userName ?? "AN")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const gradient =
    {
      g1: "linear-gradient(135deg, var(--crab), var(--gold))",
      g2: "linear-gradient(135deg, #5a89c8, #8a5aa8)",
      g3: "linear-gradient(135deg, var(--green), #3b5b7d)",
      g4: "linear-gradient(135deg, var(--ink), #403a31)",
    }[r.avatarSwatch ?? "g1"] ??
    "linear-gradient(135deg, var(--crab), var(--gold))";

  const photos =
    r.photoUrls && r.photoUrls.length > 0
      ? r.photoUrls
      : r.photoUrl
        ? [r.photoUrl]
        : [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-3 flex items-center gap-2 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href={`/spot/${r.spotId}`}
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
          A take
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Spot card */}
        <Link
          href={`/spot/${r.spotId}`}
          className="block bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3 mb-4"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-16 h-16 rounded-xl bg-cover bg-center flex-shrink-0"
              style={{
                backgroundImage: r.spotPhoto
                  ? `url(${r.spotPhoto})`
                  : "linear-gradient(135deg, #e8c185, #6b4024)",
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--crab)] font-semibold">
                Crab cake at
              </div>
              <div className="font-display font-extrabold text-[20px] tracking-tight leading-tight truncate">
                {r.spotName}
              </div>
              <div className="text-[12px] text-[var(--ink-3)] font-medium">
                {r.spotCity}
              </div>
            </div>
          </div>
        </Link>

        {/* The rating */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              href={`/u/${r.userId}`}
              className="flex items-center gap-2 group"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold overflow-hidden flex-shrink-0"
                style={{
                  background: r.avatarUrl ? "transparent" : gradient,
                  backgroundImage: r.avatarUrl
                    ? `url(${r.avatarUrl})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!r.avatarUrl && initials}
              </div>
              <div>
                <div className="text-[14px] font-bold flex items-center gap-1.5 group-hover:underline underline-offset-2 decoration-dotted">
                  {r.userName ?? "A Baltimore local"}
                  {r.isBoysReview && (
                    <span
                      className="font-mono text-[8.5px] tracking-[.06em] uppercase font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "var(--crab)", color: "#fff" }}
                    >
                      Boys
                    </span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-[var(--ink-3)]">
                  {dateStr}
                </div>
              </div>
            </Link>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-display font-extrabold text-[20px] text-white flex-shrink-0"
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
          </div>

          {r.note && (
            <div
              className="italic text-[15px] text-[var(--ink-2)] leading-[1.5] pl-3 my-3"
              style={{ borderLeft: "2px solid var(--crab)" }}
            >
              "{r.note}"
            </div>
          )}

          {r.tags && r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
              {r.tags.map((t) => (
                <span
                  key={t}
                  className="font-mono text-[10px] tracking-[.04em] uppercase font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {photos.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto -mx-1 px-1 snap-x">
              {photos.map((url, i) => (
                <PhotoLightbox
                  key={url + i}
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="rounded-xl flex-shrink-0 block border-0 p-0 snap-start"
                  style={{ width: 200, height: 200 }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-4">
          <Link
            href={`/spot/${r.spotId}`}
            className="text-[13px] font-bold text-[var(--crab)] underline decoration-dotted underline-offset-2"
          >
            See the spot →
          </Link>
        </div>
      </div>
    </div>
  );
}
