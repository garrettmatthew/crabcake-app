"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addSpotByPlaceId, submitSpot } from "@/lib/actions";
import { showToast } from "./Toast";

type PlaceHit = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  venueType: string | null;
};

export default function AddSpotForm({
  initialQuery = "",
  hasKey,
}: {
  initialQuery?: string;
  hasKey: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<PlaceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);

  // Manual fallback fields
  const [mName, setMName] = useState("");
  const [mCity, setMCity] = useState("");
  const [mAddress, setMAddress] = useState("");
  const [mNote, setMNote] = useState("");

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
          `/api/place-search?q=${encodeURIComponent(q)}`,
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
        const res = await addSpotByPlaceId(placeId);
        if (res.ok) {
          showToast(res.alreadyExisted ? "Already on the map" : "Added to the map");
          router.push(`/spot/${res.spotId}`);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed to add");
      } finally {
        setAddingId(null);
      }
    });
  }

  function submitManual() {
    if (!mName.trim() || !mCity.trim()) return;
    startTransition(async () => {
      await submitSpot({
        name: mName,
        city: mCity,
        address: mAddress || undefined,
        note: mNote || undefined,
      });
      showToast("Sent to the Boys for review");
      router.push("/");
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-3 flex justify-between items-center border-b border-[var(--border)] flex-shrink-0">
        <button
          onClick={() => router.back()}
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
        </button>
        <h1 className="font-display font-extrabold text-[22px] tracking-tight">
          Add a spot
        </h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <p className="text-[13.5px] text-[var(--ink-2)] mb-4 leading-[1.5]">
          Search for any place that serves a crab cake — restaurants, oyster bars,
          country clubs, hotels, caterers. Pick from Google's results and it goes
          straight on the map.
        </p>

        {!hasKey && (
          <div className="bg-[var(--gold-soft)] border border-[var(--gold)] rounded-xl p-3 mb-3 text-[12.5px]">
            Search is offline right now. Use the manual form below.
          </div>
        )}

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
              placeholder='e.g. "Costas Inn Dundalk" or "Greenspring Valley"'
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
                  <div className="flex items-center gap-2 mt-1">
                    {r.venueType && <span className="chip">{r.venueType}</span>}
                    {r.rating != null && (
                      <span className="text-[11px] flex items-center gap-1 font-semibold">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="#fbbc04"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {r.rating.toFixed(1)}
                        {r.ratingCount != null && (
                          <span className="text-[var(--ink-3)] font-medium">
                            ({r.ratingCount.toLocaleString()})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="flex-shrink-0 h-9 px-3 rounded-full font-bold text-[12px] flex items-center text-white"
                  style={{ background: "var(--crab)" }}
                >
                  {addingId === r.placeId ? "Adding…" : "+ Add"}
                </div>
              </button>
            ))}
          </div>
        )}

        {q.trim().length >= 2 && !loading && results.length === 0 && hasKey && (
          <div className="text-center py-6 text-[13px] text-[var(--ink-3)]">
            No matches. Try adding the city.
          </div>
        )}

        <div className="text-center my-5">
          <button
            onClick={() => setShowManual((v) => !v)}
            className="text-[12.5px] font-semibold text-[var(--ink-3)] underline decoration-dotted underline-offset-2"
          >
            {showManual
              ? "Hide manual form"
              : "Can't find it? Submit it manually"}
          </button>
        </div>

        {showManual && (
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 mb-4">
            <div className="text-[12.5px] text-[var(--ink-2)] mb-3 leading-[1.5]">
              For private clubs, pop-ups, or anywhere Google doesn't list. Goes
              to the Boys for review.
            </div>
            <Field label="Name">
              <input
                className="w-full h-11 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium"
                value={mName}
                onChange={(e) => setMName(e.target.value)}
                placeholder="Suburban Country Club"
              />
            </Field>
            <Field label="City">
              <input
                className="w-full h-11 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium"
                value={mCity}
                onChange={(e) => setMCity(e.target.value)}
                placeholder="Pikesville, MD"
              />
            </Field>
            <Field label="Address (optional)">
              <input
                className="w-full h-11 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium"
                value={mAddress}
                onChange={(e) => setMAddress(e.target.value)}
              />
            </Field>
            <Field label="What's the cake like?">
              <textarea
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[14px] min-h-20 resize-none leading-[1.4]"
                value={mNote}
                onChange={(e) => setMNote(e.target.value)}
                placeholder="What makes it worth ranking?"
              />
            </Field>
            <button
              onClick={submitManual}
              disabled={adding || !mName.trim() || !mCity.trim()}
              className="h-12 w-full bg-[var(--crab)] text-white rounded-full font-extrabold text-[14.5px] mt-2 disabled:opacity-60"
              style={{ boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)" }}
            >
              {adding ? "Sending…" : "Submit for review →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5 pl-0.5">
        {label}
      </div>
      {children}
    </div>
  );
}
