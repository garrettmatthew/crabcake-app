"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions";
import { showToast } from "./Toast";

const SWATCHES: Array<[string, string]> = [
  ["g1", "linear-gradient(135deg, var(--crab), var(--gold))"],
  ["g2", "linear-gradient(135deg, #5a89c8, #8a5aa8)"],
  ["g3", "linear-gradient(135deg, var(--green), #3b5b7d)"],
  ["g4", "linear-gradient(135deg, var(--ink), #403a31)"],
];

export default function EditProfileForm({
  displayName: initialName,
  homeCity: initialCity,
  bio: initialBio,
  avatarSwatch: initialSwatch,
}: {
  displayName: string;
  homeCity: string;
  bio: string;
  avatarSwatch: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialName);
  const [homeCity, setHomeCity] = useState(initialCity);
  const [bio, setBio] = useState(initialBio);
  const [swatch, setSwatch] = useState(initialSwatch);
  const [pending, startTransition] = useTransition();

  const initials = (displayName || "RL")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "RL";

  const activeGradient = SWATCHES.find((s) => s[0] === swatch)?.[1] ?? SWATCHES[0][1];

  function save() {
    startTransition(async () => {
      await updateProfile({ displayName, homeCity, bio, avatarSwatch: swatch });
      showToast("Profile saved");
      router.push("/me");
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-3 flex justify-between items-center border-b border-[var(--border)] flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="font-display font-extrabold text-[22px] tracking-tight">Edit profile</h1>
        <button
          onClick={save}
          disabled={pending}
          className="h-9 px-3.5 rounded-full bg-[var(--crab)] text-white text-xs font-bold disabled:opacity-60"
        >
          {pending ? "…" : "Save"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <div className="flex flex-col items-center gap-3.5 mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white font-display font-extrabold text-4xl tracking-[-.03em] shadow-lg"
            style={{ background: activeGradient }}
          >
            {initials}
          </div>
          <div className="flex gap-2">
            {SWATCHES.map(([id, bg]) => (
              <button
                key={id}
                onClick={() => setSwatch(id)}
                className={`w-8 h-8 rounded-full border-2 ${
                  swatch === id ? "border-[var(--ink)]" : "border-transparent"
                }`}
                style={{ background: bg }}
              />
            ))}
          </div>
        </div>

        <Field label="Display name">
          <input
            className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium text-[var(--ink)]"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        <Field label="Home city">
          <input
            className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium text-[var(--ink)]"
            value={homeCity}
            onChange={(e) => setHomeCity(e.target.value)}
          />
        </Field>
        <Field label="Bio">
          <textarea
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[14.5px] font-medium text-[var(--ink)] min-h-20 resize-none leading-[1.4]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people your crab cake philosophy."
          />
        </Field>

        <button
          onClick={save}
          disabled={pending}
          className="h-[52px] w-full bg-[var(--crab)] text-white rounded-2xl font-bold text-[15px] mt-3.5 disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5 pl-0.5">
        {label}
      </div>
      {children}
    </div>
  );
}
