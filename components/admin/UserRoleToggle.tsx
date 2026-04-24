"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "@/lib/actions";
import { showToast } from "../Toast";

export default function UserRoleToggle({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: "user" | "admin";
}) {
  const [role, setRole] = useState<"user" | "admin">(currentRole);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = role === "admin" ? "user" : "admin";
    startTransition(async () => {
      setRole(next);
      try {
        await setUserRole(userId, next);
        showToast(next === "admin" ? "Promoted to Boys" : "Revoked admin");
      } catch {
        setRole(role);
        showToast("Change failed");
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`h-9 px-3 rounded-full font-bold text-[12px] flex-shrink-0 transition-colors ${
        role === "admin"
          ? "bg-[var(--ink)] text-[var(--bg)]"
          : "bg-[var(--panel-2)] border border-[var(--border-2)] text-[var(--ink-2)]"
      }`}
    >
      {pending ? "…" : role === "admin" ? "Revoke" : "Make Boy"}
    </button>
  );
}
