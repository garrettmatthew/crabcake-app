"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/lib/actions";

/**
 * Fires the mark-as-read server action once when the notifications
 * page mounts. Refreshes the router after so the bell badge updates
 * across the rest of the app.
 */
export default function MarkAllReadOnMount() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await markNotificationsRead();
        if (!cancelled) router.refresh();
      } catch {
        /* best effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
