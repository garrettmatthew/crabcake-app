import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserProfile, listFollowers } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import UserList from "@/components/UserList";

export const dynamic = "force-dynamic";

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, followers, me] = await Promise.all([
    getUserProfile(id),
    listFollowers(id),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-3 flex items-center gap-2 border-b border-[var(--border)] flex-shrink-0">
        <Link
          href={me?.id === profile.id ? "/me" : `/u/${profile.id}`}
          className="w-9 h-9 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display font-extrabold text-[18px] tracking-tight">
          {profile.displayName ?? "Profile"}'s followers
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <UserList
          users={followers}
          emptyText="No followers yet."
          highlightId={me?.id ?? null}
        />
      </div>
    </div>
  );
}
