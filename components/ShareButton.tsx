"use client";

import { useState } from "react";
import { showToast } from "./Toast";

/**
 * Tiny share button — uses the native share sheet when available,
 * falls back to copying the URL to the clipboard.
 */
export default function ShareButton({
  url,
  title,
  text,
  ariaLabel = "Share",
}: {
  url: string;
  title?: string;
  text?: string;
  ariaLabel?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const fullUrl = url.startsWith("http")
        ? url
        : `${typeof window !== "undefined" ? window.location.origin : ""}${url}`;
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({ title, text, url: fullUrl });
        return;
      }
      await navigator.clipboard.writeText(fullUrl);
      showToast("Link copied");
    } catch {
      // Either AbortError from share or clipboard failure — quietly noop.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={ariaLabel}
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
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    </button>
  );
}
