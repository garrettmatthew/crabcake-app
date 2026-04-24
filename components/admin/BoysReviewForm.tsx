"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postBoysReview } from "@/lib/actions";
import { showToast } from "../Toast";

export default function BoysReviewForm({
  spot,
}: {
  spot: {
    id: string;
    name: string;
    city: string;
    photoUrl: string | null;
    boysScore: number | null;
    boysReviewQuote: string | null;
    boysReviewPrep: string | null;
    style: string | null;
    filler: string | null;
    size: string | null;
    price: string | null;
    side: string | null;
    establishedYear: string | null;
  };
}) {
  const router = useRouter();
  const [score, setScore] = useState(spot.boysScore ?? 8);
  const [quote, setQuote] = useState(spot.boysReviewQuote ?? "");
  const [prep, setPrep] = useState(spot.boysReviewPrep ?? "Broiled");
  const [style, setStyle] = useState(spot.style ?? "");
  const [filler, setFiller] = useState(spot.filler ?? "");
  const [size, setSize] = useState(spot.size ?? "");
  const [price, setPrice] = useState(spot.price ?? "");
  const [side, setSide] = useState(spot.side ?? "");
  const [photoUrl, setPhotoUrl] = useState(spot.photoUrl ?? "");
  const [establishedYear, setEstablishedYear] = useState(spot.establishedYear ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await postBoysReview({
        spotId: spot.id,
        score,
        quote,
        prep,
        style: style || undefined,
        filler: filler || undefined,
        size: size || undefined,
        price: price || undefined,
        side: side || undefined,
        establishedYear: establishedYear || undefined,
        photoUrl: photoUrl || undefined,
      });
      showToast("Boys review posted");
      router.push("/admin/spots");
    });
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
        <div
          className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0"
          style={{
            backgroundImage: spot.photoUrl ? `url(${spot.photoUrl})` : undefined,
            background: spot.photoUrl
              ? undefined
              : "linear-gradient(135deg, #e8c185, #6b4024)",
          }}
        />
        <div>
          <div className="font-display font-extrabold text-[18px] tracking-tight">
            {spot.name}
          </div>
          <div className="text-[12px] text-[var(--ink-3)]">{spot.city}</div>
        </div>
      </div>

      <Field label="Boys score (0–10)">
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={score}
          onChange={(e) => setScore(parseFloat(e.target.value))}
          className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 font-display font-extrabold text-[20px] text-[var(--crab)]"
        />
      </Field>

      <Field label="The Boys' take (1–2 sentences)">
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          className="w-full bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 py-3 text-[14px] italic min-h-[80px] resize-none leading-[1.4]"
          placeholder="The platonic ideal. All lump, no filler, no excuse…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Prep">
          <Select value={prep} onChange={setPrep} options={["Broiled", "Fried", "Both"]} />
        </Field>
        <Field label="Style">
          <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Jumbo Lump" className={input} />
        </Field>
        <Field label="Filler">
          <Select value={filler} onChange={setFiller} options={["", "Minimal", "Light", "Moderate", "Heavy"]} />
        </Field>
        <Field label="Size">
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="~7 oz" className={input} />
        </Field>
        <Field label="Price">
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$22" className={input} />
        </Field>
        <Field label="Side">
          <input value={side} onChange={(e) => setSide(e.target.value)} placeholder="Saltines" className={input} />
        </Field>
      </div>

      <Field label="Photo URL (optional)">
        <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" className={input} />
      </Field>
      <Field label="Established year (optional)">
        <input value={establishedYear} onChange={(e) => setEstablishedYear(e.target.value)} placeholder="1886" className={input} />
      </Field>

      <button
        onClick={save}
        disabled={pending || !quote.trim()}
        className="h-[52px] w-full bg-[var(--crab)] text-white rounded-full font-extrabold text-[15px] mt-3 disabled:opacity-60"
        style={{ boxShadow: "0 4px 14px -4px rgba(232,61,53,.45)" }}
      >
        {pending ? "Posting…" : spot.boysScore ? "Update Boys review" : "Post Boys review"}
      </button>
    </div>
  );
}

const input =
  "w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14px] font-medium text-[var(--ink)]";

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

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o || "—"}
        </option>
      ))}
    </select>
  );
}
