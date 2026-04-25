"use client";

import { useState, useTransition } from "react";
import { reportSpot } from "@/lib/actions";
import { showToast } from "./Toast";

const REASONS: Array<[string, string]> = [
  ["closed", "This spot is closed"],
  ["wrong-info", "Wrong info (address, hours, etc.)"],
  ["doesnt-serve-crab-cakes", "Doesn't serve crab cakes"],
  ["duplicate", "Duplicate of another spot"],
  ["spam", "Spam or junk listing"],
  ["other", "Something else"],
];

/**
 * Discreet "Report" link on the spot detail page. Opens a small bottom
 * sheet with a list of reasons. Sends a server action.
 */
export default function ReportSpotButton({ spotId }: { spotId: string }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!picked) return;
    startTransition(async () => {
      try {
        await reportSpot({
          spotId,
          reason: picked,
          note: note || undefined,
        });
        showToast("Report sent. The Boys will take a look.");
        setOpen(false);
        setPicked(null);
        setNote("");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed to send");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11.5px] text-[var(--ink-3)] font-semibold underline decoration-dotted underline-offset-2"
      >
        Report this spot
      </button>

      {open && (
        <div
          onClick={() => !pending && setOpen(false)}
          className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[var(--panel)] rounded-t-3xl sm:rounded-3xl p-4 max-h-[85vh] overflow-y-auto"
            style={{ boxShadow: "0 -10px 40px rgba(0,0,0,0.2)" }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-display font-extrabold text-[20px] tracking-tight">
                Report this spot
              </h3>
              <button
                onClick={() => !pending && setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}
              >
                ×
              </button>
            </div>
            <p className="text-[12.5px] text-[var(--ink-3)] mb-3 leading-[1.4]">
              Tell us what's wrong. Reports go to the Boys for review.
            </p>
            <div className="flex flex-col gap-1.5 mb-3">
              {REASONS.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPicked(id)}
                  className="text-left rounded-xl px-3 py-2.5 text-[13.5px] font-semibold border"
                  style={{
                    background:
                      picked === id ? "var(--gold-soft, rgba(228,178,72,.18))" : "var(--bg)",
                    borderColor: picked === id ? "var(--gold)" : "var(--border)",
                    color: "var(--ink)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {picked === "other" && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell us more (optional)"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[13.5px] min-h-20 resize-none mb-3"
              />
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!picked || pending}
              className="h-[48px] w-full rounded-full text-white font-extrabold text-[14.5px] disabled:opacity-50"
              style={{
                background: "var(--crab)",
                boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)",
              }}
            >
              {pending ? "Sending…" : "Send report"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
