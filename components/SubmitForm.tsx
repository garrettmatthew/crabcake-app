"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSpot } from "@/lib/actions";
import { showToast } from "./Toast";

export default function SubmitForm({
  initial,
}: {
  initial: {
    name: string;
    city: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city);
  const [address, setAddress] = useState(initial.address);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) return;
    startTransition(async () => {
      await submitSpot({
        name,
        city,
        address: address || undefined,
        note: note || undefined,
        latitude: initial.latitude,
        longitude: initial.longitude,
      });
      showToast("Submitted for review");
      router.push("/");
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
        <h1 className="font-display font-extrabold text-[22px] tracking-tight">Add a spot</h1>
        <div style={{ width: 36 }} />
      </div>

      <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <p className="text-[13.5px] text-[var(--ink-2)] leading-[1.5] mb-5">
          Know a crab cake worth ranking? Submit it and a Baltimore Boy will verify and score it.
        </p>

        <Field label="Restaurant name">
          <input
            className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium text-[var(--ink)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Faidley's Seafood"
          />
        </Field>
        <Field label="City">
          <input
            className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium text-[var(--ink)]"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            placeholder="Baltimore, MD"
          />
        </Field>
        <Field label="Address (optional)">
          <input
            className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium text-[var(--ink)]"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="203 N Paca St"
          />
        </Field>
        <Field label="Why should we review this?">
          <textarea
            className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[14.5px] font-medium text-[var(--ink)] min-h-[90px] resize-none leading-[1.4]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Hidden gem? Legend? Underrated? Tell us what we're missing."
          />
        </Field>

        <button
          type="submit"
          disabled={pending || !name.trim() || !city.trim()}
          className="h-[52px] w-full bg-[var(--crab)] text-white rounded-full font-extrabold text-[15px] mt-3 disabled:opacity-60"
          style={{ boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)" }}
        >
          {pending ? "Submitting…" : "Submit for review →"}
        </button>
      </form>
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
