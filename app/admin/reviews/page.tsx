import Link from "next/link";
import { listAllRatingsForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const rows = await listAllRatingsForAdmin(200);

  const todayCount = rows.filter((r) => {
    const d = new Date(r.createdAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }).length;

  const boysCount = rows.filter((r) => r.isBoysReview).length;
  const communityCount = rows.length - boysCount;

  return (
    <div className="px-3 py-3">
      <div className="mb-3">
        <h2 className="font-display font-extrabold text-[20px] tracking-tight">
          All reviews ({rows.length})
        </h2>
        <div className="text-[12px] text-[var(--ink-3)] font-medium mt-0.5">
          {todayCount} today · {boysCount} Boys · {communityCount} community ·
          newest first
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-[13px] text-[var(--ink-3)] text-center py-10">
          No reviews yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const score = parseFloat(r.score);
            const created = new Date(r.createdAt);
            const dateStr = created.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
            const photoCount =
              (r.photoUrls?.length ?? 0) ||
              (r.photoUrl ? 1 : 0);
            return (
              <div
                key={r.id}
                className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Link
                        href={`/spot/${r.spotId}`}
                        className="font-display font-bold text-[15px] tracking-tight truncate hover:underline"
                      >
                        {r.spotName ?? r.spotId}
                      </Link>
                      {r.isBoysReview && (
                        <span className="chip chip-brand">Boys</span>
                      )}
                      {r.spotPublished === false && (
                        <span className="chip">Hidden</span>
                      )}
                      {photoCount > 0 && (
                        <span className="chip">
                          📷 {photoCount}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[var(--ink-3)] font-medium">
                      <Link
                        href={`/u/${r.userId}`}
                        className="font-bold text-[var(--ink-2)] hover:underline"
                      >
                        {r.userName ?? "—"}
                      </Link>
                      {r.userEmail && (
                        <span className="text-[var(--ink-3)]">
                          {" · "}
                          {r.userEmail}
                        </span>
                      )}
                      {r.userRole === "admin" && (
                        <>
                          {" · "}
                          <span className="font-mono text-[10px] tracking-[.06em] uppercase font-bold">
                            admin
                          </span>
                        </>
                      )}
                      <span> · {r.spotCity}</span>
                      <span> · {dateStr}</span>
                    </div>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-display font-extrabold text-[13px] text-white flex-shrink-0"
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
                    className="text-[13px] italic text-[var(--ink-2)] leading-[1.4] mt-2 pl-2"
                    style={{ borderLeft: "2px solid var(--border-2)" }}
                  >
                    "{r.note}"
                  </div>
                )}
                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.tags.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-2.5 text-[11px] font-bold">
                  <Link
                    href={`/r/${r.id}`}
                    className="text-[var(--ink-2)] underline decoration-dotted underline-offset-2"
                  >
                    Open review →
                  </Link>
                  <Link
                    href={`/spot/${r.spotId}`}
                    className="text-[var(--ink-2)] underline decoration-dotted underline-offset-2"
                  >
                    Spot
                  </Link>
                  <Link
                    href={`/u/${r.userId}`}
                    className="text-[var(--ink-2)] underline decoration-dotted underline-offset-2"
                  >
                    User
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
