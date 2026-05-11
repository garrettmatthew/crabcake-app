"use client";

import { useState, useTransition } from "react";
import { setEmailDigest } from "@/lib/actions";
import { showToast } from "./Toast";

/**
 * Inline opt-in/out toggle for the daily email digest. Surfaced at
 * the top of /notifications so users don't have to dig into /me/edit
 * to find it.
 */
export default function EmailDigestToggle({
  initial,
  email,
}: {
  initial: boolean;
  email: string | null;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!email) return;
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        await setEmailDigest(next);
        showToast(
          next
            ? "Daily email digest on"
            : "Email digest off — find it in Me → Edit"
        );
      } catch (e) {
        setEnabled(!next);
        showToast(e instanceof Error ? e.message : "Couldn't update");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || !email}
      className="w-full flex items-center gap-3 px-3.5 py-3 bg-[var(--panel)] border border-[var(--border)] rounded-2xl mb-3 text-left disabled:opacity-60"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold leading-tight">
          Daily email digest
        </div>
        <div className="text-[11.5px] text-[var(--ink-3)] mt-0.5 leading-tight">
          {email
            ? enabled
              ? "On — one summary per day"
              : "Off — turn on to get a daily summary"
            : "Add an email to your account to enable"}
        </div>
      </div>
      <div
        role="switch"
        aria-checked={enabled}
        className="w-10 h-6 rounded-full relative flex-shrink-0"
        style={{
          background: enabled ? "var(--crab)" : "var(--border-2)",
          transition: "background .15s",
        }}
      >
        <div
          className="absolute top-[2px] w-5 h-5 rounded-full bg-white"
          style={{
            left: enabled ? 18 : 2,
            transition: "left .15s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </button>
  );
}
