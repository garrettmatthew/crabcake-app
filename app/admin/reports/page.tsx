import Link from "next/link";
import { db } from "@/lib/db";
import { reports, spots, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import ReportRow from "@/components/admin/ReportRow";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  closed: "Closed",
  "wrong-info": "Wrong info",
  "doesnt-serve-crab-cakes": "No crab cakes",
  duplicate: "Duplicate",
  spam: "Spam",
  other: "Other",
};

export default async function AdminReportsPage() {
  const rows = await db
    .select({
      id: reports.id,
      spotId: reports.spotId,
      reason: reports.reason,
      note: reports.note,
      status: reports.status,
      createdAt: reports.createdAt,
      reporterName: users.displayName,
      spotName: spots.name,
      spotCity: spots.city,
      spotPublished: spots.isPublished,
    })
    .from(reports)
    .leftJoin(spots, eq(spots.id, reports.spotId))
    .leftJoin(users, eq(users.id, reports.userId))
    .orderBy(desc(reports.createdAt))
    .limit(100);

  const pending = rows.filter((r) => r.status === "pending");
  const handled = rows.filter((r) => r.status !== "pending");

  return (
    <div className="px-3 py-3">
      <h2 className="font-display font-extrabold text-[20px] tracking-tight mb-3">
        Pending reports ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <div className="text-[13px] text-[var(--ink-3)] text-center py-10">
          No pending reports. The Boys are well-behaved.
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((r) => (
            <ReportRow
              key={r.id}
              report={{
                ...r,
                reasonLabel: REASON_LABELS[r.reason] ?? r.reason,
              }}
            />
          ))}
        </div>
      )}

      {handled.length > 0 && (
        <>
          <h3 className="font-display font-extrabold text-[15px] tracking-tight mt-6 mb-2">
            Recently handled
          </h3>
          <div className="space-y-2 opacity-70">
            {handled.slice(0, 20).map((r) => (
              <div
                key={r.id}
                className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/spot/${r.spotId}`}
                    className="font-display font-bold text-[13.5px] tracking-tight"
                  >
                    {r.spotName ?? r.spotId}
                  </Link>
                  <span
                    className="font-mono text-[9px] tracking-[.06em] uppercase font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      background:
                        r.status === "actioned" ? "var(--crab)" : "var(--ink-3)",
                      color: "#fff",
                    }}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="text-[11.5px] text-[var(--ink-3)] mt-0.5">
                  {REASON_LABELS[r.reason] ?? r.reason}
                  {r.reporterName ? ` · ${r.reporterName}` : ""}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
