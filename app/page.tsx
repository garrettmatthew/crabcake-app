import { listSpots } from "@/lib/queries";
import { ensureDemoUser } from "@/lib/auth";
import HomeMap from "@/components/HomeMap";
import CrabLogo from "@/components/CrabLogo";
import SearchBar from "@/components/SearchBar";
import Link from "next/link";

export default async function HomePage() {
  const user = await ensureDemoUser();
  const spots = await listSpots();

  const initials = user?.displayName
    ? user.displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : null;

  return (
    <>
      <div
        className="px-3.5 pt-1.5 pb-2.5 flex items-center gap-2.5 flex-shrink-0"
        style={{
          position: "relative",
          zIndex: 500,
          background: "var(--bg)",
        }}
      >
        <div
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: "var(--crab)" }}
        >
          <CrabLogo size={26} />
        </div>
        <SearchBar />
        <Link
          href="/me"
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white font-extrabold text-[13px]"
          style={{
            background: initials
              ? "linear-gradient(135deg, var(--crab), var(--gold))"
              : "var(--bg-2)",
            color: initials ? "white" : "var(--ink-3)",
          }}
        >
          {initials ?? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
          )}
        </Link>
      </div>

      <HomeMap spots={spots} />
    </>
  );
}
