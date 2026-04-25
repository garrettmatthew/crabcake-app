"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteRating } from "@/lib/actions";
import { showToast } from "./Toast";

/**
 * Compact inline controls shown in the corner of the "Baltimore Boys'
 * Take" card when the signed-in user is the Boy who authored that
 * official review. Edit takes them to /rate where the form is already
 * pre-filled with their rating + note + tags. Delete confirms inline
 * via toast and clears the spot's boys_* fields server-side.
 */
export default function BoysTakeControls({
  spotId,
  boysScore,
}: {
  spotId: string;
  boysScore: number | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      try {
        const res = await deleteRating(spotId);
        if (res.ok) {
          showToast("Boys review deleted");
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
        <span className="text-[var(--ink-3)] font-medium">Delete?</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="font-bold text-[var(--ink-2)] px-1.5 py-0.5"
        >
          No
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="font-bold text-white px-2 py-0.5 rounded-full"
          style={{ background: "var(--crab)" }}
        >
          {pending ? "…" : "Yes"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/rate?spot=${spotId}`}
        aria-label="Edit Boys take"
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
        aria-label="Delete Boys take"
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
      <span className="sr-only">{boysScore ?? ""}</span>
    </div>
  );
}
