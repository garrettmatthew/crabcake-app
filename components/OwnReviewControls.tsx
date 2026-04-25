"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteRating } from "@/lib/actions";
import { showToast } from "./Toast";

/**
 * Inline edit + delete icons for a user's own review row in the
 * Community list. Compact — same vertical footprint as the score
 * circle next to it.
 */
export default function OwnReviewControls({ spotId }: { spotId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      try {
        const res = await deleteRating(spotId);
        if (res.ok) {
          showToast("Review deleted");
          router.refresh();
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed to delete");
      } finally {
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 text-[11.5px]">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="font-bold text-[var(--ink-2)] px-1.5 py-0.5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="font-bold text-white px-2.5 py-0.5 rounded-full"
          style={{ background: "var(--crab)" }}
        >
          {pending ? "…" : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/rate?spot=${spotId}`}
        aria-label="Edit your review"
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.04)", color: "var(--ink-2)" }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </Link>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Delete your review"
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "rgba(232,61,53,0.08)", color: "var(--crab)" }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
