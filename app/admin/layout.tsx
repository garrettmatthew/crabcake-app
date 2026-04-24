import Link from "next/link";
import { ensureDemoUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureDemoUser();
  if (!user) redirect("/sign-in?redirect_url=/admin");
  if (user.role !== "admin") notFound();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        className="px-3 py-2.5 flex justify-between items-center flex-shrink-0"
        style={{ background: "var(--ink)", color: "var(--bg)" }}
      >
        <Link href="/" className="text-[var(--gold)] font-mono text-[11px] tracking-[.12em]">
          ← BACK TO APP
        </Link>
        <div className="font-display font-extrabold text-[16px] tracking-tight">
          Admin
        </div>
        <div style={{ width: 90 }} />
      </div>
      <div className="flex border-b border-[var(--border)] flex-shrink-0">
        <Link
          href="/admin/spots"
          className="flex-1 text-center py-2.5 text-[13px] font-bold text-[var(--ink-2)]"
        >
          Spots
        </Link>
        <Link
          href="/admin/collections"
          className="flex-1 text-center py-2.5 text-[13px] font-bold text-[var(--ink-2)]"
        >
          Lists
        </Link>
        <Link
          href="/admin/submissions"
          className="flex-1 text-center py-2.5 text-[13px] font-bold text-[var(--ink-2)]"
        >
          Queue
        </Link>
        <Link
          href="/admin/users"
          className="flex-1 text-center py-2.5 text-[13px] font-bold text-[var(--ink-2)]"
        >
          Users
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto pb-24">{children}</div>
    </div>
  );
}
