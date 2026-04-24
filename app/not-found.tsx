import Link from "next/link";
import CrabLogo from "@/components/CrabLogo";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div
        className="w-24 h-24 rounded-3xl flex items-center justify-center text-white mb-6 opacity-50"
        style={{ background: "var(--ink)" }}
      >
        <CrabLogo size={56} />
      </div>
      <h1 className="font-display font-extrabold text-[34px] tracking-tight leading-none mb-2">
        Crab went sideways.
      </h1>
      <p className="text-[14.5px] text-[var(--ink-2)] leading-[1.5] max-w-72 mb-6">
        This page doesn't exist, or it scuttled away. Let's get you back to the map.
      </p>
      <Link
        href="/"
        className="h-[52px] px-6 rounded-full bg-[var(--crab)] text-white font-extrabold text-[15px] inline-flex items-center"
        style={{ boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)" }}
      >
        Back to the map
      </Link>
    </div>
  );
}
