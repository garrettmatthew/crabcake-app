import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserProfile, listRatingsByUser } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();
  // If you click into your own profile, just send you to /me.
  if (me?.id === id) redirect("/me");

  const [profile, userRatings] = await Promise.all([
    getUserProfile(id),
    listRatingsByUser(id),
  ]);
  if (!profile) notFound();

  const initials = (profile.displayName ?? "AN")
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
    }[profile.avatarSwatch ?? "g1"] ??
    "linear-gradient(135deg, var(--crab), var(--gold))";

  const boysRatings = userRatings.filter((r) => r.isBoysReview);
  const communityRatings = userRatings.filter((r) => !r.isBoysReview);
  const avgScore =
    userRatings.length === 0
      ? null
      : (
          userRatings.reduce((s, r) => s + parseFloat(r.score), 0) /
          userRatings.length
        ).toFixed(1);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-3 py-3 flex items-center gap-2 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href="/"
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
          Profile
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Profile card */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-extrabold overflow-hidden flex-shrink-0"
              style={{
                background: profile.avatarUrl ? "transparent" : gradient,
                backgroundImage: profile.avatarUrl
                  ? `url(${profile.avatarUrl})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!profile.avatarUrl && initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-display font-extrabold text-[22px] tracking-tight leading-none">
                  {profile.displayName ?? "A Baltimore local"}
                </div>
                {profile.role === "admin" && (
                  <span
                    className="font-mono text-[9px] tracking-[.08em] uppercase font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "var(--ink)", color: "#fff" }}
                  >
                    Baltimore Boy
                  </span>
                )}
              </div>
              {profile.homeCity && (
                <div className="text-[12.5px] text-[var(--ink-3)] font-medium mt-1">
                  {profile.homeCity}
                </div>
              )}
            </div>
          </div>
          {profile.bio && (
            <div className="text-[13px] text-[var(--ink-2)] leading-[1.45] mb-3">
              {profile.bio}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
            <Stat label="Reviews" value={String(userRatings.length)} />
            <Stat label="Boys" value={String(boysRatings.length)} />
            <Stat label="Avg" value={avgScore ?? "—"} />
          </div>
        </div>

        {/* Reviews list */}
        {userRatings.length === 0 ? (
          <div className="text-center text-[13px] text-[var(--ink-3)] py-12">
            No reviews yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="font-display font-bold text-[15px] tracking-tight pl-1">
              Reviews
            </div>
            {userRatings.map((r) => {
              const score = parseFloat(r.score);
              const dateStr = new Date(r.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <Link
                  key={r.id}
                  href={`/spot/${r.spotId}`}
                  className="block bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0"
                      style={{
                        backgroundImage: r.spotPhoto
                          ? `url(${r.spotPhoto})`
                          : "linear-gradient(135deg, #e8c185, #6b4024)",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-[15px] tracking-tight truncate">
                          {r.spotName}
                        </span>
                        {r.isBoysReview && (
                          <span
                            className="font-mono text-[8.5px] tracking-[.06em] uppercase font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: "var(--crab)", color: "#fff" }}
                          >
                            Boys
                          </span>
                        )}
                      </div>
                      <div className="text-[11.5px] text-[var(--ink-3)] font-medium">
                        {r.spotCity} · {dateStr}
                      </div>
                      {r.note && (
                        <div className="text-[12.5px] text-[var(--ink-2)] mt-1 leading-[1.4] line-clamp-2">
                          {r.note}
                        </div>
                      )}
                    </div>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-display font-extrabold text-[13px] text-white flex-shrink-0"
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-display font-extrabold text-[20px] tracking-tight leading-none">
        {value}
      </div>
      <div className="font-mono text-[9px] tracking-[.08em] uppercase text-[var(--ink-3)] mt-1 font-semibold">
        {label}
      </div>
    </div>
  );
}
