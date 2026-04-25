import Link from "next/link";
import { ensureDemoUser, hasClerk } from "@/lib/auth";
import { listMyRatings, listFollowing } from "@/lib/queries";
import PassportBadges from "@/components/PassportBadges";
import ScoreCircle, { scoreClass } from "@/components/ScoreCircle";
import CrabLogo from "@/components/CrabLogo";

export default async function MePage() {
  const user = await ensureDemoUser();

  // Clerk mode + not signed in → show sign-in prompt
  if (hasClerk && !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-white mb-5"
          style={{ background: "var(--crab)" }}
        >
          <CrabLogo size={48} />
        </div>
        <h2 className="font-display font-extrabold text-[28px] tracking-tight leading-none mb-2">
          Sign in to rate.
        </h2>
        <p className="text-[14.5px] text-[var(--ink-2)] leading-[1.5] max-w-72 mb-6">
          Your ratings, bookmarks, and taste profile — synced across every device.
        </p>
        <Link
          href="/sign-in"
          className="h-[52px] px-7 rounded-full bg-[var(--crab)] text-white font-extrabold text-[15px] inline-flex items-center gap-2 shadow-lg"
          style={{ boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)" }}
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="mt-3 text-[13.5px] font-semibold text-[var(--ink-2)]"
        >
          No account? <span className="text-[var(--crab)]">Create one →</span>
        </Link>
      </div>
    );
  }

  const ratings = await listMyRatings();
  const followingList = user ? await listFollowing(user.id) : [];

  const initials = (user?.displayName ?? "—")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const avg =
    ratings.length > 0
      ? (ratings.reduce((a, r) => a + parseFloat(r.score), 0) / ratings.length).toFixed(1)
      : "—";
  const top =
    ratings.length > 0
      ? Math.max(...ratings.map((r) => parseFloat(r.score))).toFixed(1)
      : "—";

  const gradient =
    {
      g1: "linear-gradient(135deg, var(--crab), var(--gold))",
      g2: "linear-gradient(135deg, #5a89c8, #8a5aa8)",
      g3: "linear-gradient(135deg, var(--green), #3b5b7d)",
      g4: "linear-gradient(135deg, var(--ink), #403a31)",
    }[user?.avatarSwatch ?? "g1"] || "linear-gradient(135deg, var(--crab), var(--gold))";

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-3.5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-none">Me.</h1>
          <div className="text-xs text-[var(--ink-3)] font-medium mt-0.5">Your cake log + settings.</div>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <Link
              href="/admin"
              aria-label="Admin"
              style={{
                height: "36px",
                padding: "0 14px",
                borderRadius: "999px",
                background: "var(--ink)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
                fontSize: "12.5px",
                letterSpacing: "-.01em",
              }}
            >
              <span style={{ color: "var(--gold)", fontSize: "14px" }}>★</span>
              Admin
            </Link>
          )}
          <Link
            href="/me/edit"
            className="w-9 h-9 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center"
            aria-label="Edit profile"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Gradient profile card */}
        <div
          className="mx-3.5 mb-4 rounded-3xl p-5 text-white relative overflow-hidden"
          style={{ background: gradient }}
        >
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3 z-2">
            <div
              className="w-14 h-14 rounded-full backdrop-blur flex items-center justify-center font-display font-extrabold text-xl tracking-tight border-[1.5px] border-white/30 overflow-hidden"
              style={{
                background: user?.avatarUrl ? "transparent" : "rgba(255,255,255,0.2)",
                backgroundImage: user?.avatarUrl
                  ? `url(${user.avatarUrl})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!user?.avatarUrl && (initials || "—")}
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-lg tracking-tight leading-[1.1]">
                {user?.displayName ?? "You"}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                {user?.homeCity ?? "Baltimore, MD"}
              </div>
            </div>
          </div>
          <div className="relative grid grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-white/25">
            <Stat n={ratings.length} l="Rated" />
            <Stat n={avg} l="Avg" />
            <Stat n={top} l="Top" />
            <Stat n={0} l="Saved" asLink={true} />
          </div>
        </div>

        {/* Passport badges */}
        <div className="px-3.5">
          <PassportBadges
            ratings={ratings.map((r) => ({
              spotId: r.spotId,
              spotCity: r.spotCity,
              isBoysReview: r.isBoysReview ?? false,
              score: r.score,
              createdAt: r.createdAt,
            }))}
            spotsById={Object.fromEntries(
              ratings.map((r) => [
                r.spotId,
                {
                  id: r.spotId,
                  city: r.spotCity,
                  venueType: r.spotVenueType ?? null,
                },
              ])
            )}
            isAdmin={user?.role === "admin"}
          />
        </div>

        {/* Following list */}
        {followingList.length > 0 && (
          <div className="px-3.5 mb-4">
            <h3 className="font-display font-bold text-[17px] tracking-tight mb-2.5 flex justify-between items-baseline">
              Following
              <span className="text-xs text-[var(--ink-3)] font-medium">
                {followingList.length}
              </span>
            </h3>
            <div className="flex gap-2.5 overflow-x-auto -mx-1 px-1 pb-1">
              {followingList.map((f) => {
                const fInitials = (f.displayName ?? "—")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase();
                const fGradient =
                  {
                    g1: "linear-gradient(135deg, var(--crab), var(--gold))",
                    g2: "linear-gradient(135deg, #5a89c8, #8a5aa8)",
                    g3: "linear-gradient(135deg, var(--green), #3b5b7d)",
                    g4: "linear-gradient(135deg, var(--ink), #403a31)",
                  }[f.avatarSwatch ?? "g1"] ??
                  "linear-gradient(135deg, var(--crab), var(--gold))";
                return (
                  <Link
                    key={f.id}
                    href={`/u/${f.id}`}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5"
                    style={{ width: 70 }}
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[16px] font-extrabold overflow-hidden"
                      style={{
                        background: f.avatarUrl ? "transparent" : fGradient,
                        backgroundImage: f.avatarUrl
                          ? `url(${f.avatarUrl})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {!f.avatarUrl && fInitials}
                    </div>
                    <div className="text-[11px] font-bold tracking-tight truncate max-w-full text-center">
                      {f.displayName ?? "—"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-3.5 mb-2.5">
          <h3 className="font-display font-bold text-[17px] tracking-tight mb-2.5 flex justify-between items-baseline">
            Your ratings
            <span className="text-xs text-[var(--ink-3)] font-medium">
              {ratings.length} {ratings.length === 1 ? "entry" : "entries"}
            </span>
          </h3>
          {ratings.length === 0 ? (
            <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 text-center">
              <div className="text-sm text-[var(--ink-3)] mb-3">
                You haven't rated anything yet.
              </div>
              <Link
                href="/"
                className="inline-flex h-10 px-4 bg-[var(--crab)] text-white rounded-full items-center font-bold text-sm"
              >
                Browse the map →
              </Link>
            </div>
          ) : (
            ratings.map((r) => {
              const myScore = parseFloat(r.score);
              const boys = r.boysScore != null ? parseFloat(r.boysScore) : null;
              const delta = boys != null ? myScore - boys : null;
              const date = new Date(r.createdAt);
              const dateStr = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return (
                <Link
                  key={r.id}
                  href={`/spot/${r.spotId}`}
                  className="grid gap-3 p-3 bg-[var(--panel)] border border-[var(--border)] rounded-2xl items-center mb-2"
                  style={{ gridTemplateColumns: "52px 1fr auto" }}
                >
                  <div
                    className="w-[52px] h-[52px] rounded-xl bg-cover bg-center"
                    style={{
                      backgroundImage: r.spotPhoto ? `url(${r.spotPhoto})` : undefined,
                      background: r.spotPhoto
                        ? undefined
                        : "linear-gradient(135deg, #e8c185, #6b4024)",
                    }}
                  />
                  <div>
                    <div className="font-display font-bold text-sm tracking-tight">
                      {r.spotName}
                    </div>
                    <div className="text-[11px] text-[var(--ink-3)] font-medium mt-0.5">
                      {dateStr} · {r.spotCity}
                    </div>
                    {r.note && (
                      <div className="text-[11.5px] text-[var(--ink-2)] italic leading-[1.3] mt-1">
                        "{r.note}"
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <ScoreCircle score={myScore} size="md" />
                    {delta != null && (
                      <div
                        className={`font-mono text-[9px] font-semibold mt-0.5 ${
                          delta > 0
                            ? "text-[var(--green)]"
                            : delta < 0
                              ? "text-[var(--crab)]"
                              : "text-[var(--ink-3)]"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)} vs Boys
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  n,
  l,
  asLink,
}: {
  n: number | string;
  l: string;
  asLink?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="font-display font-extrabold text-[22px] tracking-tight leading-none">
        {n}
      </div>
      <div className="font-mono text-[8.5px] tracking-[.06em] uppercase opacity-85 mt-1 font-medium">
        {l}
      </div>
    </div>
  );
}
