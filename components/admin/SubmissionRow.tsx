"use client";

import { useState, useTransition } from "react";
import { approveSubmission, rejectSubmission } from "@/lib/actions";
import { showToast } from "../Toast";

export default function SubmissionRow({
  submission,
}: {
  submission: {
    id: string;
    name: string;
    city: string;
    address: string | null;
    note: string | null;
    userDisplayName: string | null;
    createdAt: Date | string;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  async function autoGeocode() {
    if (!submission.address && !submission.city) return;
    setGeocoding(true);
    try {
      const q = [submission.name, submission.address, submission.city]
        .filter(Boolean)
        .join(", ");
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=us&limit=1&q=${encodeURIComponent(
        q
      )}`;
      const r = await fetch(url, {
        headers: { "User-Agent": "Crabcake App" },
      });
      if (r.ok) {
        const data = await r.json();
        if (data[0]) {
          setLat(data[0].lat);
          setLng(data[0].lon);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setGeocoding(false);
    }
  }

  function approve() {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      showToast("Need valid lat/lng");
      return;
    }
    startTransition(async () => {
      try {
        await approveSubmission(submission.id, {
          latitude,
          longitude,
          photoUrl: photoUrl.trim() || undefined,
          neighborhood: neighborhood.trim() || undefined,
        });
        showToast("Approved & added to the map");
      } catch {
        showToast("Couldn't approve");
      }
    });
  }

  function reject() {
    startTransition(async () => {
      await rejectSubmission(submission.id);
      showToast("Rejected");
    });
  }

  const date = new Date(submission.createdAt);

  return (
    <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-3.5 mb-3">
      <div className="flex justify-between items-start mb-1.5">
        <div className="font-display font-extrabold text-[17px] tracking-tight">
          {submission.name}
        </div>
        <div className="font-mono text-[10px] text-[var(--ink-3)]">
          {date.toLocaleDateString()}
        </div>
      </div>
      <div className="text-[12.5px] text-[var(--ink-3)] mb-2">
        {submission.city}
        {submission.address ? <> · {submission.address}</> : null}
      </div>
      {submission.note && (
        <div className="text-[13px] text-[var(--ink-2)] italic mb-2 leading-[1.4]">
          "{submission.note}"
        </div>
      )}
      <div className="text-[11px] text-[var(--ink-3)] mb-3">
        Submitted by {submission.userDisplayName ?? "anonymous"}
      </div>

      {!open ? (
        <div className="flex gap-2">
          <button
            className="flex-1 h-10 bg-[var(--crab)] text-white rounded-full font-bold text-[13px]"
            onClick={() => setOpen(true)}
          >
            Approve…
          </button>
          <button
            className="h-10 px-4 border border-[var(--border-2)] rounded-full font-bold text-[13px]"
            onClick={reject}
            disabled={pending}
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-2 border-t border-[var(--border)] pt-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Latitude"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="h-10 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3 text-sm font-mono"
            />
            <input
              placeholder="Longitude"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="h-10 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3 text-sm font-mono"
            />
          </div>
          <button
            onClick={autoGeocode}
            disabled={geocoding}
            className="w-full h-9 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg text-xs font-bold"
          >
            {geocoding ? "Looking up…" : "📍 Auto-geocode from address"}
          </button>
          <input
            placeholder="Neighborhood (optional)"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="w-full h-10 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3 text-sm"
          />
          <input
            placeholder="Photo URL (optional)"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="w-full h-10 bg-[var(--bg-2)] border border-[var(--border)] rounded-lg px-3 text-sm"
          />
          <div className="flex gap-2">
            <button
              className="flex-1 h-10 bg-[var(--crab)] text-white rounded-full font-bold text-[13px]"
              onClick={approve}
              disabled={pending}
            >
              {pending ? "Adding…" : "Add to map"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="h-10 px-4 border border-[var(--border-2)] rounded-full font-bold text-[13px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
