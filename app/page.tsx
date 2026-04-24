import { listSpots } from "@/lib/queries";
import { ensureDemoUser } from "@/lib/auth";
import HomeMap from "@/components/HomeMap";
import CrabLogo from "@/components/CrabLogo";
import Link from "next/link";

export default async function HomePage() {
  const user = await ensureDemoUser();
  const spots = await listSpots();

  const initials = (user?.displayName ?? "RL")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="px-3.5 pt-1.5 pb-2.5 flex items-center gap-2.5 relative z-[30] flex-shrink-0">
        <div
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: "var(--crab)" }}
        >
          <CrabLogo size={26} />
        </div>
        <div className="flex-1 h-10 bg-[var(--panel)] border border-[var(--border)] rounded-full px-3.5 flex items-center gap-2 min-w-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search a spot, city, or zip"
            className="flex-1 bg-transparent text-sm font-medium min-w-0 w-full"
          />
        </div>
        <Link
          href="/me"
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white font-extrabold text-[13px]"
          style={{ background: "linear-gradient(135deg, var(--crab), var(--gold))" }}
        >
          {initials || "RL"}
        </Link>
      </div>

      <HomeMap spots={spots} />
    </>
  );
}
