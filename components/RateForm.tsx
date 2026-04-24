"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SpotWithStats } from "@/lib/queries";
import { submitRating } from "@/lib/actions";

export default function RateForm({
  spots,
  initialSpot,
  isAdmin = false,
  tagOptions,
}: {
  spots: SpotWithStats[];
  initialSpot: SpotWithStats;
  isAdmin?: boolean;
  tagOptions: string[];
}) {
  const ALL_TAGS = tagOptions;
  const router = useRouter();
  const [spotId, setSpotId] = useState(initialSpot.id);
  const spot = spots.find((s) => s.id === spotId) ?? initialSpot;

  const [score, setScore] = useState(spot.userRating ?? 8.4);
  const [note, setNote] = useState(spot.userNote ?? "");
  const [tags, setTags] = useState<string[]>(spot.userTags ?? []);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [asBoys, setAsBoys] = useState(isAdmin); // Default ON for admins
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset form when spot changes
  useEffect(() => {
    const s = spots.find((x) => x.id === spotId);
    if (s) {
      setScore(s.userRating ?? 8.4);
      setNote(s.userNote ?? "");
      setTags(s.userTags ?? []);
    }
  }, [spotId, spots]);

  // Dial drag
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastScoreRef = useRef(score);
  function setDialFromX(clientX: number) {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const s = Math.round(pct * 100) / 10;
    setScore(s);
    if (Math.floor(s * 10) !== Math.floor(lastScoreRef.current * 10)) {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(3);
      lastScoreRef.current = s;
    }
  }
  useEffect(() => {
    function move(e: MouseEvent | TouchEvent) {
      if (!draggingRef.current) return;
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      setDialFromX(x);
      if (e.cancelable) e.preventDefault();
    }
    function up() {
      draggingRef.current = false;
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, []);

  function toggleTag(t: string) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      });
      const data = await res.json();
      if (data.url) setPhotoUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  function onSubmit() {
    startTransition(async () => {
      await submitRating({
        spotId,
        score,
        note: note || undefined,
        tags,
        photoUrl: photoUrl || undefined,
        asBoys: isAdmin && asBoys,
      });
      setSuccess(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([15, 50, 30]);
      // Force router to re-fetch server data (community score, reviews list, etc.)
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        router.push(`/spot/${spotId}`);
        // Refresh again after navigation to ensure fresh data
        setTimeout(() => router.refresh(), 50);
      }, 1700);
    });
  }

  const scorePct = (score / 10) * 100;
  const scoreColor = score >= 9 ? "var(--gold)" : score >= 8 ? "var(--crab)" : score >= 7 ? "#c98551" : "var(--ink-3)";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3.5 py-3 flex justify-between items-center flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 className="font-display text-[22px] font-extrabold tracking-tight m-0">Rate a spot</h2>
        <div style={{ width: 36 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 pb-24">
        {/* Admin: post as Boys toggle */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setAsBoys(!asBoys)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "16px",
              background: asBoys ? "var(--ink)" : "var(--panel)",
              border: asBoys ? "2px solid var(--gold)" : "1px solid var(--border)",
              color: asBoys ? "#fff" : "var(--ink)",
              marginBottom: "12px",
              textAlign: "left",
              cursor: "pointer",
              transition: "all .15s ease",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: asBoys ? "var(--crab)" : "var(--bg-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              <span style={{ color: asBoys ? "var(--gold)" : "var(--ink-3)" }}>★</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "14px", letterSpacing: "-.01em" }}>
                Post as Baltimore Boys
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: asBoys ? "rgba(255,255,255,.75)" : "var(--ink-3)",
                  marginTop: "2px",
                  lineHeight: 1.3,
                }}
              >
                {asBoys
                  ? "This becomes the official Boys score for this spot."
                  : "Saves as personal. Tap to make it the official Boys score."}
              </div>
            </div>
            <div
              style={{
                width: "44px",
                height: "26px",
                borderRadius: "999px",
                background: asBoys ? "var(--gold)" : "var(--border-2)",
                position: "relative",
                flexShrink: 0,
                transition: "background .15s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  left: asBoys ? "20px" : "2px",
                  width: "22px",
                  height: "22px",
                  background: "#fff",
                  borderRadius: "50%",
                  transition: "left .2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                }}
              />
            </div>
          </button>
        )}

        {/* Spot selector */}
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-2.5 flex items-center gap-3 mb-3.5"
        >
          <div
            className="w-12 h-12 rounded-xl bg-cover bg-center flex-shrink-0"
            style={{
              backgroundImage: spot.photoUrl
                ? `url(${spot.photoUrl})`
                : "linear-gradient(135deg, #e8c185, #6b4024)",
            }}
          />
          <div className="flex-1 text-left min-w-0">
            <div className="font-display font-bold text-[15px] tracking-tight truncate">
              {spot.name}
            </div>
            <div className="text-[11.5px] text-[var(--ink-3)] font-medium">
              {spot.city}
              {spot.price ? <> · {spot.price}</> : null}
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-[var(--ink-3)]"
            style={{ transform: pickerOpen ? "rotate(180deg)" : undefined, transition: "transform .2s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {pickerOpen && (
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl mb-3.5 max-h-60 overflow-y-auto">
            {spots.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSpotId(s.id);
                  setPickerOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 border-b border-[var(--border)] last:border-b-0 flex items-center gap-2.5 ${
                  s.id === spotId ? "bg-[var(--panel-2)]" : ""
                }`}
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
                  <div className="font-display font-bold text-[13.5px] truncate">{s.name}</div>
                  <div className="text-[11px] text-[var(--ink-3)]">{s.city}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Dial */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl px-4 pt-6 pb-4 mb-2.5 text-center">
          <div
            className="font-display font-extrabold text-[82px] leading-none tracking-[-.05em] mb-1 transition-colors"
            style={{ color: scoreColor }}
          >
            {score.toFixed(1)}
          </div>
          <div className="font-mono text-[10px] tracking-[.06em] text-[var(--ink-3)] uppercase font-medium mt-1 mb-5">
            Your score · drag to change
          </div>
          <div
            ref={trackRef}
            className="relative h-8"
            onClick={(e) => setDialFromX(e.clientX)}
          >
            <div className="absolute left-0 right-0 top-1/2 h-1.5 bg-[var(--bg-2)] rounded-full -translate-y-1/2" />
            <div
              className="absolute left-0 top-1/2 h-1.5 rounded-full -translate-y-1/2"
              style={{
                width: `${scorePct}%`,
                background:
                  "linear-gradient(90deg, var(--ink-3), #c98551, var(--crab), var(--gold))",
              }}
            />
            <div
              className="absolute top-1/2 w-[30px] h-[30px] bg-[var(--panel)] border-2 border-[var(--ink)] rounded-full flex items-center justify-center font-display font-extrabold text-[11px] text-[var(--ink)] cursor-grab shadow-md"
              style={{
                left: `${scorePct}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseDown={(e) => {
                draggingRef.current = true;
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                draggingRef.current = true;
                e.preventDefault();
              }}
            >
              {score.toFixed(1)}
            </div>
          </div>
          <div className="flex justify-between mt-2 font-mono text-[9px] text-[var(--ink-3)] font-medium">
            <span>0</span>
            <span>2.5</span>
            <span>5</span>
            <span>7.5</span>
            <span>10</span>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl px-3.5 py-3 mb-2.5">
          <h5 className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] m-0 mb-2 font-semibold">
            Tags
          </h5>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    height: "30px",
                    padding: "0 12px",
                    borderRadius: "999px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    lineHeight: 1,
                    border: on ? "1.5px solid var(--crab)" : "1.5px solid var(--border-2)",
                    background: on ? "var(--crab)" : "var(--panel)",
                    color: on ? "#fff" : "var(--ink-2)",
                    cursor: "pointer",
                    transition: "all .15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {on && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write a quick review (optional)"
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl px-3.5 py-3 text-[13.5px] leading-[1.4] min-h-20 resize-none text-[var(--ink)] mb-2.5"
        />

        {/* Photo upload */}
        <label
          htmlFor="photo-upload"
          className="flex items-center gap-2.5 bg-[var(--panel)] border border-dashed border-[var(--border-2)] rounded-2xl px-3.5 py-3 mb-2.5 cursor-pointer"
        >
          {photoUrl ? (
            <>
              <div
                className="w-12 h-12 rounded-xl bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${photoUrl})` }}
              />
              <div className="flex-1">
                <div className="text-[13px] font-bold">Photo attached</div>
                <div className="text-[10.5px] text-[var(--ink-3)]">Tap to replace</div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPhotoUrl(null);
                }}
                className="w-7 h-7 rounded-full bg-[var(--bg-2)] flex items-center justify-center text-[var(--ink-3)]"
              >
                ×
              </button>
            </>
          ) : (
            <>
              <div className="w-[34px] h-[34px] rounded-lg bg-[var(--bg-2)] flex items-center justify-center text-[var(--ink-2)]">
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-[var(--border-2)] border-t-[var(--crab)] rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold">
                  {uploading ? "Uploading…" : "Add a photo"}
                </div>
                <div className="text-[10.5px] text-[var(--ink-3)]">
                  Optional · JPG, PNG, HEIC
                </div>
              </div>
            </>
          )}
          <input
            id="photo-upload"
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        <button
          onClick={onSubmit}
          disabled={pending || uploading}
          className="h-[52px] w-full bg-[var(--crab)] text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
        >
          {pending ? "Posting…" : "Post rating →"}
        </button>
      </div>

      {/* Success overlay */}
      <div
        className={`absolute inset-0 bg-[var(--crab)] text-white z-[100] flex flex-col items-center justify-center text-center transition-opacity duration-300 ${
          success ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="text-[96px] leading-none mb-5" style={{ animation: success ? "float-y 3s ease-in-out infinite" : undefined }}>
          🦀
        </div>
        <div className="font-display font-extrabold text-[34px] tracking-tight leading-none mb-2.5">
          {isAdmin && asBoys ? (
            <>
              Official Boys<br />review posted.
            </>
          ) : (
            <>
              Posted to the<br />community.
            </>
          )}
        </div>
        <div className="font-sans text-[15px] opacity-90 max-w-72">
          {isAdmin && asBoys
            ? "This is now the official Baltimore Boys score for this spot."
            : "Your rating is live and moving the crowd score."}
        </div>
        <div className="mt-6 font-display font-extrabold text-lg bg-white/15 px-5 py-2.5 rounded-full flex items-center gap-2 backdrop-blur border border-white/30">
          Your score · <b className="text-[26px] tracking-[-.04em]">{score.toFixed(1)}</b>
        </div>
      </div>
    </div>
  );
}
