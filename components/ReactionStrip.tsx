"use client";

import { useState, useTransition } from "react";
import { toggleReaction } from "@/lib/actions";
import { showToast } from "./Toast";

const KINDS: Array<{ kind: string; emoji: string; label: string }> = [
  { kind: "crab", emoji: "🦀", label: "Crab on" },
  { kind: "fire", emoji: "🔥", label: "Fire" },
  { kind: "skull", emoji: "💀", label: "Skull" },
];

/**
 * Inline reaction strip rendered under each community review.
 * Optimistic toggle on tap — bumps count immediately, rolls back if
 * the action fails.
 */
export default function ReactionStrip({
  ratingId,
  initialCounts,
  initialMine,
}: {
  ratingId: string;
  initialCounts: Record<string, number>;
  initialMine: string[];
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState<Set<string>>(new Set(initialMine));
  const [, startTransition] = useTransition();

  function onToggle(kind: string) {
    const wasMine = mine.has(kind);
    // Optimistic update
    const nextMine = new Set(mine);
    if (wasMine) nextMine.delete(kind);
    else nextMine.add(kind);
    setMine(nextMine);
    setCounts((c) => ({
      ...c,
      [kind]: Math.max(0, (c[kind] ?? 0) + (wasMine ? -1 : 1)),
    }));
    startTransition(async () => {
      try {
        await toggleReaction({ ratingId, kind });
      } catch (e) {
        // Roll back on failure
        const rb = new Set(mine);
        setMine(rb);
        setCounts((c) => ({
          ...c,
          [kind]: Math.max(0, (c[kind] ?? 0) + (wasMine ? 1 : -1)),
        }));
        showToast(e instanceof Error ? e.message : "Couldn't react");
      }
    });
  }

  return (
    <div className="flex gap-1 mt-1.5">
      {KINDS.map(({ kind, emoji, label }) => {
        const count = counts[kind] ?? 0;
        const active = mine.has(kind);
        if (count === 0 && !active) {
          // Render small ghost button so users can opt in
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onToggle(kind)}
              aria-label={label}
              className="h-7 px-2 rounded-full text-[12px] font-semibold flex items-center gap-1 opacity-60 hover:opacity-100"
              style={{
                background: "transparent",
                border: "1px dashed var(--border-2)",
                color: "var(--ink-3)",
              }}
            >
              <span>{emoji}</span>
            </button>
          );
        }
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onToggle(kind)}
            aria-label={label}
            aria-pressed={active}
            className="h-7 px-2 rounded-full text-[12px] font-semibold flex items-center gap-1"
            style={{
              background: active
                ? "var(--gold-soft, rgba(228,178,72,.18))"
                : "var(--panel)",
              border: active
                ? "1px solid var(--gold)"
                : "1px solid var(--border)",
              color: "var(--ink)",
            }}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
