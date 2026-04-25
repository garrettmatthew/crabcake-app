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
    <div className="flex gap-1.5 mt-2">
      {KINDS.map(({ kind, emoji, label }) => {
        const count = counts[kind] ?? 0;
        const active = mine.has(kind);
        const hasCount = count > 0;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onToggle(kind)}
            aria-label={label}
            aria-pressed={active}
            className={`pill ${active ? "pill-on" : ""} ${
              !active && !hasCount ? "pill-muted" : ""
            }`}
            style={{ minWidth: 38 }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{emoji}</span>
            {hasCount && (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
