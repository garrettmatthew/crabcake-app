"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminAddSpotByPlaceId } from "@/lib/actions";
import { showToast } from "../Toast";

type PlaceHit = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
};

export default function AdminAddSpotForm({ hasKey }: { hasKey: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    ctrlRef.current?.abort();
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      try {
        const r = await fetch(
          `/api/admin/place-search?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal }
        );
        const data = await r.json();
        setResults(data.places ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function addSpot(placeId: string) {
    setAddingId(placeId);
    startTransition(async () => {
      try {
        const res = await adminAddSpotByPlaceId(placeId);
        if (res.ok) {
          showToast(res.alreadyExisted ? "Already in DB" : "Added to map");
          router.push(`/admin/spots/${res.spotId}`);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed to add");
      } finally {
        setAddingId(null);
      }
    });
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Link
          href="/admin/spots"
          className="text-[var(--ink-3)] font-mono text-[11px] tracking-[.1em]"
        >
          ← SPOTS
        </Link>
        <h2 className="font-display font-extrabold text-xl tracking-tight">Add a spot</h2>
        <div className="w-12" />
      </div>

      {!hasKey && (
        <div className="bg-[var(--gold-soft)] border border-[var(--gold)] rounded-xl p-3 mb-3 text-[12.5px]">
          <b>Google Places key not set.</b> Can't search Google until it is.
        </div>
      )}

      <p className="text-[13px] text-[var(--ink-2)] mb-3 leading-[1.5]">
        Search any restaurant. The Boy who adds it is attributed. Google data populates automatically.
      </p>

      <div className="relative mb-3">
        <div className="flex items-center gap-2 bg-[var(--panel)] border border-[var(--border)] rounded-full px-3.5 h-11">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Costas Inn Dundalk"
            className="flex-1 bg-transparent text-[14px] font-medium outline-none"
            autoFocus
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[var(--border-2)] border-t-[var(--crab)] rounded-full animate-spin" />
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {results.map((r) => (
            <button
              key={r.placeId}
              onClick={() => addSpot(r.placeId)}
              disabled={adding}
              className="w-full text-left px-3.5 py-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--panel-2)] flex items-start gap-3 disabled:opacity-60"
            >
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[14.5px] tracking-tight">
                  {r.name}
                </div>
                <div className="text-[11.5px] text-[var(--ink-3)] font-medium mt-0.5">
                  {r.address}
                </div>
                {r.rating != null && (
                  <div className="text-[11px] mt-1 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#fbbc04">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="font-semibold">{r.rating.toFixed(1)}</span>
                    {r.ratingCount != null && (
                      <span className="text-[var(--ink-3)]">
                        ({r.ratingCount.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 h-9 px-3 rounded-full bg-[var(--crab)] text-white font-bold text-[12px] flex items-center">
                {addingId === r.placeId ? "Adding…" : "+ Add"}
              </div>
            </button>
          ))}
        </div>
      )}

      {q.trim().length >= 2 && !loading && results.length === 0 && (
        <div className="text-center py-8 text-[13px] text-[var(--ink-3)]">
          No results. Try adding the city (e.g. "Koco's Pub Baltimore").
        </div>
      )}
    </div>
  );
}
