"use client";

import { useState, useTransition } from "react";
import { toggleBookmark } from "@/lib/actions";
import { showToast } from "./Toast";

export default function SpotActions({ spotId, isSaved }: { spotId: string; isSaved: boolean }) {
  const [saved, setSaved] = useState(isSaved);
  const [pending, startTransition] = useTransition();

  function handleBookmark() {
    startTransition(async () => {
      const next = !saved;
      setSaved(next);
      try {
        const res = await toggleBookmark(spotId);
        setSaved(res.bookmarked);
        showToast(res.bookmarked ? "Saved to want-to-try" : "Removed from saved");
        if (navigator.vibrate) navigator.vibrate(10);
      } catch {
        setSaved(!next);
      }
    });
  }

  return (
    <>
      <button
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(26,22,18,.12)" }}
        onClick={handleBookmark}
        disabled={pending}
        aria-label="Save"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ color: saved ? "var(--crab)" : "currentColor" }}
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      </button>
      <button
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(26,22,18,.12)" }}
        onClick={() => showToast("Link copied")}
        aria-label="Share"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
          <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
      </button>
    </>
  );
}
