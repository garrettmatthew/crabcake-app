import Link from "next/link";
import { listAllSpots } from "@/lib/queries";
import BulkEnrichButton from "@/components/admin/BulkEnrichButton";

export default async function AdminSpotsPage() {
  const spots = await listAllSpots();
  const hasKey = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3 gap-2">
        <h2 className="font-display font-extrabold text-xl tracking-tight">
          Spots ({spots.length})
        </h2>
        <div className="flex gap-2">
          <Link
            href="/admin/spots/new"
            className="h-10 px-4 bg-[var(--crab)] text-white rounded-full font-bold text-[13px] flex items-center gap-1.5"
          >
            + Add
          </Link>
          {hasKey && <BulkEnrichButton />}
        </div>
      </div>
      {!hasKey && (
        <div className="bg-[var(--gold-soft)] border border-[var(--gold)] rounded-xl p-3 mb-3 text-[12.5px] leading-[1.45]">
          <b>Google Places key not set.</b> Add <code className="font-mono text-[11px] bg-[var(--bg-2)] px-1 py-0.5 rounded">GOOGLE_PLACES_API_KEY</code> to Vercel env to enable auto-enrichment.
        </div>
      )}
      {spots.map((s) => (
        <Link
          key={s.id}
          href={`/admin/spots/${s.id}`}
          className="flex items-center gap-3 p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-xl mb-1.5"
        >
          <div
            className="w-12 h-12 rounded-lg bg-cover bg-center flex-shrink-0"
            style={{
              backgroundImage: s.photoUrl ? `url(${s.photoUrl})` : undefined,
              background: s.photoUrl
                ? undefined
                : "linear-gradient(135deg, #e8c185, #6b4024)",
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[14.5px] tracking-tight truncate">
              {s.name}
            </div>
            <div className="text-[11.5px] text-[var(--ink-3)] truncate">
              {s.city}
              {s.boysScore ? <> · Boys {parseFloat(s.boysScore as string).toFixed(1)}</> : " · No Boys score"}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
