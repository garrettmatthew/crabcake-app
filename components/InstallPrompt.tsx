"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "crabcakes:install-dismissed";

/**
 * iOS install hint — Apple doesn't support beforeinstallprompt, so we
 * detect iOS Safari + non-standalone and show a small bottom sheet
 * explaining how to add to home screen. Dismissed state persists per
 * device. Hidden once added.
 *
 * For Android Chrome we capture beforeinstallprompt and show a single
 * "Install" button; tapping it triggers the native install dialog.
 */
export default function InstallPrompt() {
  const [variant, setVariant] = useState<"ios" | "android" | null>(null);
  const [deferred, setDeferred] = useState<{
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    // Already running as installed app — nothing to do.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari proprietary
      Boolean(window.navigator.standalone);
    if (standalone) return;

    const ua = navigator.userAgent;
    const isiOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isiOS) {
      // Hold off briefly so we don't compete with the page load animation.
      const t = setTimeout(() => setVariant("ios"), 1200);
      return () => clearTimeout(t);
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      // @ts-expect-error BeforeInstallPromptEvent isn't in lib.dom yet.
      setDeferred(e);
      setVariant("android");
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* private browsing — ignore */
    }
    setVariant(null);
  }

  async function installAndroid() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") dismiss();
      else dismiss();
    } catch {
      dismiss();
    }
  }

  if (!variant) return null;

  return (
    <div
      className="fixed left-3 right-3 z-[1100]"
      style={{
        bottom: "calc(var(--tab-h, 64px) + 12px)",
      }}
    >
      <div
        className="rounded-2xl px-3.5 py-3 flex items-center gap-3"
        style={{
          background: "var(--ink)",
          color: "var(--bg)",
          boxShadow: "0 12px 30px -10px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--crab)" }}
        >
          <svg
            viewBox="0 0 32 32"
            width="22"
            height="22"
            fill="#fff"
            aria-hidden="true"
          >
            <ellipse cx="16" cy="18" rx="7" ry="5.5" />
            <circle cx="13" cy="11" r="1.8" />
            <circle cx="19" cy="11" r="1.8" />
            <rect x="12.3" y="12.5" width="1.4" height="2.5" rx=".5" />
            <rect x="18.3" y="12.5" width="1.4" height="2.5" rx=".5" />
            <path d="M 2 16 Q 2 14 4 14 Q 7 14 9 16 L 9 17 L 6 17 Z" />
            <path d="M 2 20 Q 2 22 4 22 Q 7 22 9 20 L 9 19 L 6 19 Z" />
            <path d="M 30 16 Q 30 14 28 14 Q 25 14 23 16 L 23 17 L 26 17 Z" />
            <path d="M 30 20 Q 30 22 28 22 Q 25 22 23 20 L 23 19 L 26 19 Z" />
            <g
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M 10 22 L 8 26" />
              <path d="M 13 23 L 12 27" />
              <path d="M 19 23 L 20 27" />
              <path d="M 22 22 L 24 26" />
            </g>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-extrabold text-[14px] leading-tight">
            Add Crabcakes to your Home Screen
          </div>
          <div className="text-[11.5px] opacity-80 mt-0.5 leading-tight">
            {variant === "ios" ? (
              <>
                Tap{" "}
                <span aria-label="Share">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: "inline-block", verticalAlign: "-1px" }}
                  >
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>{" "}
                then "Add to Home Screen"
              </>
            ) : (
              <>One tap. No app store.</>
            )}
          </div>
        </div>
        {variant === "android" && (
          <button
            onClick={installAndroid}
            className="h-8 px-3 rounded-full text-[12px] font-bold flex-shrink-0"
            style={{ background: "var(--gold)", color: "var(--ink)" }}
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.12)", color: "var(--bg)" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
