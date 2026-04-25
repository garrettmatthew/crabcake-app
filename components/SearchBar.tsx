"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addSpotByPlaceId } from "@/lib/actions";
import { showToast } from "./Toast";

type SpotResult = {
  kind: "spot";
  id: string;
  name: string;
  city: string;
  photoUrl: string | null;
  boysScore: number | null;
};
type PlaceResult = {
  kind: "place";
  placeId: string;
  name: string;
  city: string;
  street: string | null;
  venueType: string | null;
  isFood: boolean;
  latitude: number;
  longitude: number;
  displayName: string;
};

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [spots, setSpots] = useState<SpotResult[]>([]);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const blurTimer = useRef<number | null>(null);
  const [adding, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSpots([]);
      setPlaces([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await r.json();
        setSpots(data.spots ?? []);
        setPlaces(data.places ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="flex-1 relative min-w-0">
      <div className="h-10 bg-[var(--panel)] border border-[var(--border)] rounded-full px-3.5 flex items-center gap-2 min-w-0">
        <svg
          width="15"
          height="15"
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
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Search a spot, city, or zip"
          className="flex-1 bg-transparent text-sm font-medium min-w-0 w-full"
        />
        {loading && (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--border-2)] border-t-[var(--crab)] animate-spin" />
        )}
      </div>

      {open && q.trim().length >= 2 && (spots.length > 0 || places.length > 0) && (
        <div
          className="absolute left-0 right-0 top-12 bg-[var(--panel)] border border-[var(--border)] rounded-2xl z-[60] max-h-[70vh] overflow-y-auto"
          style={{ boxShadow: "0 20px 40px -10px rgba(40,30,20,.25)" }}
        >
          {spots.length > 0 && (
            <>
              <div className="font-mono text-[9.5px] tracking-[.1em] uppercase text-[var(--ink-3)] px-3.5 pt-2.5 pb-1 font-semibold">
                Crab cake spots
              </div>
              {spots.map((s) => (
                <Link
                  key={s.id}
                  href={`/spot/${s.id}`}
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--panel-2)]"
                >
                  <div
                    className="w-9 h-9 rounded-lg bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: s.photoUrl ? `url(${s.photoUrl})` : undefined,
                      background: s.photoUrl
                        ? undefined
                        : "linear-gradient(135deg, #e8c185, #6b4024)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-[13.5px] tracking-tight truncate">
                      {s.name}
                    </div>
                    <div className="text-[11px] text-[var(--ink-3)] font-medium truncate">
                      {s.city}
                      {s.boysScore != null && (
                        <>
                          {" · "}
                          <span className="text-[var(--crab)] font-semibold">
                            Boys {s.boysScore.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
          {places.length > 0 && (
            <>
              <div className="font-mono text-[9.5px] tracking-[.1em] uppercase text-[var(--ink-3)] px-3.5 pt-2.5 pb-1 font-semibold border-t border-[var(--border)]">
                Add a new spot
              </div>
              {places.map((p) => {
                // Build the secondary line: street first if we have one, then
                // city. That's what disambiguates two "Sabrina's Cafe"s in the
                // same city — one is on Callowhill, the other on Bainbridge.
                const locationBits = [p.street, p.city].filter(Boolean);
                const subtitle = locationBits.join(" · ");
                const isThisAdding = addingId === p.placeId;
                return (
                  <button
                    key={p.placeId}
                    disabled={adding}
                    onClick={() => {
                      // We have the Google placeId already — add it directly,
                      // skipping the /submit page entirely.
                      setAddingId(p.placeId);
                      startTransition(async () => {
                        try {
                          const res = await addSpotByPlaceId(p.placeId);
                          if (res.ok) {
                            showToast(
                              res.alreadyExisted
                                ? "Already on the map"
                                : "Added to the map"
                            );
                            router.push(`/spot/${res.spotId}`);
                          }
                        } catch (e) {
                          showToast(
                            e instanceof Error ? e.message : "Failed to add"
                          );
                          setAddingId(null);
                        }
                      });
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--panel-2)] text-left disabled:opacity-60"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--bg-2)] flex items-center justify-center flex-shrink-0 text-[var(--crab)]">
                      {isThisAdding ? (
                        <div className="w-4 h-4 border-2 border-[var(--border-2)] border-t-[var(--crab)] rounded-full animate-spin" />
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-display font-bold text-[13.5px] tracking-tight truncate">
                          {p.name}
                        </span>
                        {p.venueType && (
                          <span className="chip">{p.venueType}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--ink-3)] font-medium truncate">
                        {subtitle || "Add to the map"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
