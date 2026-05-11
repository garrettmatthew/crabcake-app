import Link from "next/link";
import { listMyNotifications } from "@/lib/queries";
import { ensureDemoUser, hasClerk } from "@/lib/auth";
import { redirect } from "next/navigation";
import MarkAllReadOnMount from "@/components/MarkAllReadOnMount";
import EmailDigestToggle from "@/components/EmailDigestToggle";

export const dynamic = "force-dynamic";

const REACTION_EMOJI: Record<string, string> = {
  crab: "🦀",
  fire: "🔥",
  skull: "💀",
};

export default async function NotificationsPage() {
  const user = await ensureDemoUser();
  if (hasClerk && !user) redirect("/sign-in?redirect_url=/notifications");

  const items = await listMyNotifications(80);

  return (
    <div className="flex-1 flex flex-col min-h-0">
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
          Notifications
        </h1>
      </div>

      {/* Fire mark-as-read once on mount */}
      <MarkAllReadOnMount />

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {user && (
          <EmailDigestToggle
            initial={Boolean(user.emailDigestEnabled)}
            email={user.email ?? null}
          />
        )}
        {items.length === 0 ? (
          <div className="text-center py-16 text-[13px] text-[var(--ink-3)]">
            Nothing yet. Reactions, new followers, and badges will show up here.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const dateStr = new Date(n.createdAt).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              );
              const initials = (n.actorName ?? "—")
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
                }[n.actorAvatarSwatch ?? "g1"] ??
                "linear-gradient(135deg, var(--crab), var(--gold))";

              // Build the line + the link target per kind.
              let body: React.ReactNode;
              let href: string | null = null;
              switch (n.kind) {
                case "reaction": {
                  const e = REACTION_EMOJI[n.meta ?? ""] ?? "🦀";
                  body = (
                    <>
                      <b>{n.actorName ?? "Someone"}</b> reacted {e} to your
                      review
                      {n.spotName ? ` of ${n.spotName}` : ""}.
                    </>
                  );
                  href = n.ratingId ? `/r/${n.ratingId}` : null;
                  break;
                }
                case "new_follower": {
                  body = (
                    <>
                      <b>{n.actorName ?? "Someone"}</b> followed you.
                    </>
                  );
                  href = n.actorId ? `/u/${n.actorId}` : null;
                  break;
                }
                case "followed_user_review": {
                  body = (
                    <>
                      <b>{n.actorName ?? "Someone you follow"}</b> posted a new
                      review
                      {n.spotName ? ` of ${n.spotName}` : ""}.
                    </>
                  );
                  href = n.spotId ? `/spot/${n.spotId}` : null;
                  break;
                }
                case "badge_earned": {
                  body = (
                    <>
                      You earned a new badge — <b>{n.meta ?? "a badge"}</b>.
                    </>
                  );
                  href = "/me";
                  break;
                }
                default:
                  body = <>{n.meta ?? n.kind}</>;
              }

              const isSystem = n.kind === "badge_earned";

              const Inner = (
                <>
                  {isSystem ? (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--gold), var(--crab))",
                        fontSize: 18,
                      }}
                    >
                      🏅
                    </div>
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 overflow-hidden"
                      style={{
                        background: n.actorAvatarUrl
                          ? "transparent"
                          : gradient,
                        backgroundImage: n.actorAvatarUrl
                          ? `url(${n.actorAvatarUrl})`
                          : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {!n.actorAvatarUrl && initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] leading-[1.4] text-[var(--ink)]">
                      {body}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--ink-3)] mt-0.5">
                      {dateStr}
                    </div>
                  </div>
                  {!n.readAt && (
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: "var(--crab)" }}
                      aria-label="Unread"
                    />
                  )}
                </>
              );

              const className =
                "flex items-start gap-3 p-3 rounded-2xl border " +
                (n.readAt
                  ? "bg-[var(--panel)] border-[var(--border)]"
                  : "bg-[var(--bg-2)] border-[var(--gold)]");

              return href ? (
                <Link key={n.id} href={href} className={className}>
                  {Inner}
                </Link>
              ) : (
                <div key={n.id} className={className}>
                  {Inner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
