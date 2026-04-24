"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SpotWithStats } from "@/lib/queries";
import { submitRating } from "@/lib/actions";

const ALL_TAGS = [
  "Jumbo Lump",
  "Lump",
  "Broiled",
  "Fried",
  "Imperial",
  "Minimal Filler",
  "Heavy Filler",
  "Spicy",
  "Waterfront",
];

export default function RateForm({
  spots,
  initialSpot,
}: {
  spots: SpotWithStats[];
  initialSpot: SpotWithStats;
}) {
  const router = useRouter();
  const [spotId, setSpotId] = useState(initialSpot.id);
  const spot = spots.find((s) => s.id === spotId) ?? initialSpot;

  const [score, setScore] = useState(spot.userRating ?? 8.4);
  const [note, setNote] = useState(spot.userNote ?? "");
  const [tags, setTags] = useState<string[]>(spot.userTags ?? []);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  function onSubmit() {
    startTransition(async () => {
      await submitRating({ spotId, score, note: note || undefined, tags });
      setSuccess(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([15, 50, 30]);
      setTimeout(() => {
        setSuccess(false);
        router.push(`/spot/${spotId}`);
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
            What'd you have?
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`text-[11.5px] px-2.5 py-1 rounded-full font-semibold border transition-all ${
                  tags.includes(t)
                    ? "bg-[var(--crab)] text-white border-[var(--crab)]"
                    : "bg-[var(--bg-2)] text-[var(--ink-2)] border-transparent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="One line. Broiled or fried? Lump or filler? Would you send your in-laws?"
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-2xl px-3.5 py-3 text-[13.5px] leading-[1.4] min-h-20 resize-none text-[var(--ink)] mb-2.5"
        />

        <button
          onClick={onSubmit}
          disabled={pending}
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
          Posted to the<br />community.
        </div>
        <div className="font-sans text-[15px] opacity-90 max-w-72">
          Your rating is live and moving the crowd score.
        </div>
        <div className="mt-6 font-display font-extrabold text-lg bg-white/15 px-5 py-2.5 rounded-full flex items-center gap-2 backdrop-blur border border-white/30">
          Your score · <b className="text-[26px] tracking-[-.04em]">{score.toFixed(1)}</b>
        </div>
      </div>
    </div>
  );
}
