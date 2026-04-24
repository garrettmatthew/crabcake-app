"use client";

import { useEffect } from "react";
import Link from "next/link";
import CrabLogo from "@/components/CrabLogo";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center text-white mb-6"
        style={{ background: "var(--crab)" }}
      >
        <CrabLogo size={56} />
      </div>
      <h1 className="font-display font-extrabold text-[28px] tracking-tight leading-none mb-2">
        Something went sideways.
      </h1>
      <p className="text-[14px] text-[var(--ink-2)] leading-[1.5] max-w-72 mb-6">
        The app hit a snag. Try again — or head back to the map.
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="h-12 px-5 rounded-full bg-[var(--crab)] text-white font-bold text-[14px]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="h-12 px-5 rounded-full border border-[var(--border-2)] font-bold text-[14px] inline-flex items-center"
        >
          Back to map
        </Link>
      </div>
    </div>
  );
}
