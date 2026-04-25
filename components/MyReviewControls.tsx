"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteRating } from "@/lib/actions";
import { showToast } from "./Toast";

/**
 * Shown on the spot detail page when the signed-in user has already
 * rated this spot. Replaces the "Leave a Review" CTA with side-by-side
 * Edit and Delete buttons. Delete confirms inline before destroying the
 * rating.
 */
export default function MyReviewControls({
  spotId,
  myScore,
}: {
  spotId: string;
  myScore: number;
}) {
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
      <div className="flex flex-col gap-2.5 mb-2 mt-1">
        <div
          className="rounded-2xl px-4 py-3 text-center"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="font-display font-bold text-[15px] mb-0.5">
            Delete your review?
          </div>
          <div className="text-[12.5px] text-[var(--ink-3)]">
            Your {myScore.toFixed(1)} score and any photo will be removed.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="h-[52px] rounded-full font-extrabold text-[15px]"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={pending}
            className="h-[52px] rounded-full font-extrabold text-[15px] text-white disabled:opacity-60"
            style={{
              background: "var(--crab)",
              boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)",
            }}
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 mb-2 mt-1">
      <Link
        href={`/rate?spot=${spotId}`}
        className="h-[58px] rounded-full font-extrabold text-[16px] flex items-center justify-center gap-2 text-[var(--ink)] tracking-tight"
        style={{
          background: "var(--gold)",
          boxShadow: "0 4px 14px -4px rgba(228,178,72,.5)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        Edit your review
      </Link>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Delete review"
        className="h-[58px] w-[58px] rounded-full flex items-center justify-center"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          color: "var(--crab)",
        }}
      >
        <svg
          width="18"
          height="18"
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
          <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}
