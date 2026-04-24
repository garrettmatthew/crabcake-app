"use client";

import { useEffect, useRef, useState } from "react";

export default function SpotScoreRow({
  spotId,
  boysScore,
  communityScore,
  communityCount,
  boysPrep,
}: {
  spotId: string;
  boysScore: number | null;
  communityScore: number | null;
  communityCount: number;
  boysPrep: string | null;
}) {
  const [displayBoys, setDisplayBoys] = useState(0);
  const [displayComm, setDisplayComm] = useState(0);

  useEffect(() => {
    if (boysScore != null) animate(boysScore, setDisplayBoys);
    else setDisplayBoys(0);
    if (communityScore != null) animate(communityScore, setDisplayComm);
    else setDisplayComm(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  return (
    <div className="grid grid-cols-2 gap-2 pt-4 pb-3 mb-1">
      <div className="flex flex-col items-center gap-2">
        <div className="font-sans font-bold text-sm text-[var(--ink-2)] tracking-tight">
          Baltimore Boys
        </div>
        <div
          className="w-[74px] h-[74px] rounded-full bg-[var(--crab)] text-white flex items-center justify-center font-display font-extrabold text-[28px] tracking-tight"
          style={{
            boxShadow: "0 4px 12px rgba(232,61,53,.3)",
            border: "3px solid var(--panel)",
          }}
        >
          {boysScore == null ? "—" : displayBoys.toFixed(1)}
        </div>
        <div className="text-[11px] text-[var(--ink-3)] font-medium">{boysPrep ?? "—"}</div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="font-sans font-bold text-sm text-[var(--ink-2)] tracking-tight">
          Community
        </div>
        <div
          className="w-[74px] h-[74px] rounded-full bg-[var(--crab)] text-white flex items-center justify-center font-display font-extrabold text-[28px] tracking-tight"
          style={{
            boxShadow: "0 4px 12px rgba(232,61,53,.3)",
            border: "3px solid var(--panel)",
          }}
        >
          {communityScore == null ? "—" : displayComm.toFixed(1)}
        </div>
        <div className="text-[11px] text-[var(--ink-3)] font-medium">
          {communityCount} {communityCount === 1 ? "review" : "reviews"}
        </div>
      </div>
    </div>
  );
}

function animate(target: number, setter: (n: number) => void, duration = 260) {
  const start = performance.now();
  function frame(t: number) {
    const p = Math.min(1, (t - start) / duration);
    const ease = 1 - Math.pow(1 - p, 3);
    setter(target * ease);
    if (p < 1) requestAnimationFrame(frame);
    else setter(target);
  }
  requestAnimationFrame(frame);
}
