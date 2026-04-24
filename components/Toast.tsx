"use client";

import { useEffect, useState } from "react";

let externalTrigger: ((text: string) => void) | null = null;
export function showToast(text: string) {
  if (externalTrigger) externalTrigger(text);
}

export default function Toast() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    externalTrigger = (text) => {
      setMsg(text);
      const t = setTimeout(() => setMsg(null), 2200);
      return () => clearTimeout(t);
    };
    return () => {
      externalTrigger = null;
    };
  }, []);

  return (
    <div
      className={`absolute top-[90px] left-1/2 -translate-x-1/2 bg-[var(--ink)] text-[var(--bg)] px-4 py-2.5 rounded-full text-[13px] font-semibold shadow-xl z-[9999] flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${
        msg ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-20 pointer-events-none"
      }`}
      style={{ transform: msg ? "translate(-50%, 0)" : "translate(-50%, -80px)" }}
    >
      <svg
        className="w-3.5 h-3.5 text-[var(--gold)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{msg ?? ""}</span>
    </div>
  );
}
