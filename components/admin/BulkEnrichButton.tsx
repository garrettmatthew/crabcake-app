"use client";

import { useState, useTransition } from "react";
import { enrichAllSpotsFromGoogle } from "@/lib/actions";
import { showToast } from "../Toast";

export default function BulkEnrichButton() {
  const [results, setResults] = useState<
    Array<{ id: string; name: string; ok: boolean; reason?: string }>
  >([]);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function run() {
    setOpen(true);
    startTransition(async () => {
      try {
        const res = await enrichAllSpotsFromGoogle();
        setResults(res.results);
        const okCount = res.results.filter((r) => r.ok).length;
        showToast(`Enriched ${okCount}/${res.results.length} spots`);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Bulk enrich failed");
      }
    });
  }

  return (
    <>
      <button
        onClick={run}
        disabled={pending}
        className="h-10 px-4 bg-[var(--ink)] text-[var(--bg)] rounded-full font-bold text-[13px] disabled:opacity-60 flex items-center gap-1.5"
      >
        {pending ? (
          <>
            <div className="w-3 h-3 border-2 border-[var(--border-2)] border-t-[var(--gold)] rounded-full animate-spin" />
            Enriching {results.length > 0 ? results.length : ""}…
          </>
        ) : (
          <>📸 Pull all from Google</>
        )}
      </button>
      {open && results.length > 0 && !pending && (
        <div className="mt-3 bg-[var(--panel)] border border-[var(--border)] rounded-xl p-3">
          <div className="font-mono text-[10px] tracking-[.08em] uppercase text-[var(--ink-3)] mb-2">
            Results
          </div>
          <div className="max-h-60 overflow-y-auto text-[12px] space-y-1">
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{r.name}</span>
                <span
                  className={
                    r.ok
                      ? "text-[var(--green)] font-bold"
                      : "text-[var(--crab)] text-[10px]"
                  }
                >
                  {r.ok ? "✓" : `✗ ${r.reason ?? ""}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
