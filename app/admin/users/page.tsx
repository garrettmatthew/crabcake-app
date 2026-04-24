import { listAllUsers } from "@/lib/queries";
import UserRoleToggle from "@/components/admin/UserRoleToggle";

export default async function AdminUsersPage() {
  const users = await listAllUsers();
  return (
    <div className="p-4">
      <h2 className="font-display font-extrabold text-xl tracking-tight mb-3">
        Users ({users.length})
      </h2>
      <p className="text-[13px] text-[var(--ink-2)] mb-4 leading-[1.5]">
        Admins can post Boys reviews, approve submissions, and grant admin to others.
      </p>
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-3 p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-xl mb-1.5"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
            style={{
              background:
                {
                  g1: "linear-gradient(135deg, var(--crab), var(--gold))",
                  g2: "linear-gradient(135deg, #5a89c8, #8a5aa8)",
                  g3: "linear-gradient(135deg, var(--green), #3b5b7d)",
                  g4: "linear-gradient(135deg, var(--ink), #403a31)",
                }[u.avatarSwatch ?? "g1"] ??
                "linear-gradient(135deg, var(--crab), var(--gold))",
            }}
          >
            {(u.displayName ?? u.email ?? "?")
              .split(/[\s@]+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[14px] tracking-tight truncate flex items-center gap-1.5">
              {u.displayName ?? u.email ?? "Anonymous"}
              {u.role === "admin" && (
                <span className="bg-[var(--crab)] text-white text-[8.5px] font-mono uppercase tracking-[.08em] px-1.5 py-0.5 rounded">
                  Boys
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--ink-3)] truncate">
              {u.email ?? "—"} · {u.ratingCount} rating
              {u.ratingCount === 1 ? "" : "s"}
            </div>
          </div>
          <UserRoleToggle userId={u.id} currentRole={u.role as "user" | "admin"} />
        </div>
      ))}
    </div>
  );
}
