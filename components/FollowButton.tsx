"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/lib/actions";
import { showToast } from "./Toast";

/**
 * Follow / Unfollow toggle. Optimistic update — flips the button label
 * + style immediately, rolls back on failure. Only renders when the
 * viewer is signed in and viewing someone else's profile (decision
 * lives upstream).
 */
export default function FollowButton({
  targetUserId,
  targetName,
  initialFollowing,
}: {
  targetUserId: string;
  targetName: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function onClick() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      try {
        const res = await toggleFollow(targetUserId);
        // Sync to actual server state
        setFollowing(Boolean(res.following));
        showToast(
          res.following
            ? `Following ${targetName}`
            : `Unfollowed ${targetName}`
        );
        router.refresh();
      } catch (e) {
        // Roll back
        setFollowing(!next);
        showToast(e instanceof Error ? e.message : "Couldn't update follow");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="h-9 px-4 rounded-full font-bold text-[12.5px] disabled:opacity-60"
      style={{
        background: following ? "var(--panel)" : "var(--ink)",
        color: following ? "var(--ink)" : "var(--bg)",
        border: following
          ? "1px solid var(--border)"
          : "1px solid var(--ink)",
      }}
    >
      {following ? "Following" : "+ Follow"}
    </button>
  );
}
