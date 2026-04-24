import Link from "next/link";
import { listAllSpots } from "@/lib/queries";

export default async function AdminSpotsPage() {
  const spots = await listAllSpots();
  return (
    <div className="p-4">
      <h2 className="font-display font-extrabold text-xl tracking-tight mb-3">
        All spots ({spots.length})
      </h2>
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
