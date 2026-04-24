"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M9 11a3 3 0 106 0 3 3 0 00-6 0z" />
      <path d="M12 2a8 8 0 018 8c0 5-8 14-8 14S4 15 4 10a8 8 0 018-8z" />
    </svg>
  );
}
function IconLists() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconSaved() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}
function IconMe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide on certain screens (rate modal, sign in, sign up)
  if (
    pathname?.startsWith("/rate") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up")
  )
    return null;

  const isActive = (p: string) => {
    if (p === "/") return pathname === "/";
    return pathname?.startsWith(p);
  };

  return (
    <div className="tabs absolute bottom-0 left-0 right-0 h-16 bg-[var(--panel)] border-t border-[var(--border)] grid grid-cols-5 z-40">
      <Link
        href="/"
        className={`flex flex-col items-center justify-center gap-[3px] py-1.5 ${
          isActive("/") ? "text-[var(--crab)]" : "text-[var(--ink-3)]"
        }`}
      >
        <span className="w-[22px] h-[22px] block">
          <IconMap />
        </span>
        <span className="text-[9.5px] font-semibold tracking-tight">Map</span>
      </Link>
      <Link
        href="/lists"
        className={`flex flex-col items-center justify-center gap-[3px] py-1.5 ${
          isActive("/lists") ? "text-[var(--crab)]" : "text-[var(--ink-3)]"
        }`}
      >
        <span className="w-[22px] h-[22px] block">
          <IconLists />
        </span>
        <span className="text-[9.5px] font-semibold">Lists</span>
      </Link>
      <button
        onClick={() => router.push("/rate")}
        className="flex flex-col items-center justify-center gap-[3px] py-1.5"
      >
        <span className="bg-[var(--crab)] text-white rounded-[20px] w-10 h-10 flex items-center justify-center">
          <span className="w-6 h-6 block">
            <IconPlus />
          </span>
        </span>
      </button>
      <Link
        href="/saved"
        className={`flex flex-col items-center justify-center gap-[3px] py-1.5 ${
          isActive("/saved") ? "text-[var(--crab)]" : "text-[var(--ink-3)]"
        }`}
      >
        <span className="w-[22px] h-[22px] block">
          <IconSaved />
        </span>
        <span className="text-[9.5px] font-semibold">Saved</span>
      </Link>
      <Link
        href="/me"
        className={`flex flex-col items-center justify-center gap-[3px] py-1.5 ${
          isActive("/me") ? "text-[var(--crab)]" : "text-[var(--ink-3)]"
        }`}
      >
        <span className="w-[22px] h-[22px] block">
          <IconMe />
        </span>
        <span className="text-[9.5px] font-semibold">Me</span>
      </Link>
    </div>
  );
}
