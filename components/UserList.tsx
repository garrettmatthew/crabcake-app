import Link from "next/link";

type UserRow = {
  id: string;
  displayName: string | null;
  homeCity: string | null;
  avatarSwatch: string | null;
  avatarUrl: string | null;
  role: string | null;
};

/**
 * Vertical list of users — used on /u/[id]/followers and
 * /u/[id]/following. Each row links to that user's profile.
 */
export default function UserList({
  users,
  emptyText,
  highlightId,
}: {
  users: UserRow[];
  emptyText: string;
  /** If set, this user gets a "You" chip to mark themselves. */
  highlightId?: string | null;
}) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-[13px] text-[var(--ink-3)]">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {users.map((u) => {
        const initials = (u.displayName ?? "—")
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
          }[u.avatarSwatch ?? "g1"] ??
          "linear-gradient(135deg, var(--crab), var(--gold))";
        return (
          <Link
            key={u.id}
            href={u.id === highlightId ? "/me" : `/u/${u.id}`}
            className="flex items-center gap-3 p-3 bg-[var(--panel)] border border-[var(--border)] rounded-2xl"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-extrabold text-[14px] overflow-hidden flex-shrink-0"
              style={{
                background: u.avatarUrl ? "transparent" : gradient,
                backgroundImage: u.avatarUrl ? `url(${u.avatarUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {!u.avatarUrl && initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[14.5px] tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate">{u.displayName ?? "—"}</span>
                {u.id === highlightId && (
                  <span className="chip chip-soft">You</span>
                )}
                {u.role === "admin" && (
                  <span className="chip chip-ink">Boy</span>
                )}
              </div>
              {u.homeCity && (
                <div className="text-[11.5px] text-[var(--ink-3)] font-medium truncate">
                  {u.homeCity}
                </div>
              )}
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="text-[var(--ink-3)] flex-shrink-0"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
