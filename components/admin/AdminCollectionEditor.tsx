"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateCollection,
  deleteCollection,
  addSpotToCollection,
  removeSpotFromCollection,
} from "@/lib/actions";
import { showToast } from "../Toast";

const GRADIENTS = ["g1", "g2", "g3", "g4", "g5", "g6"] as const;
const GRAD_MAP: Record<string, string> = {
  g1: "linear-gradient(135deg, #e83d35, #8a2f1f)",
  g2: "linear-gradient(135deg, #e4b248, #8a6420)",
  g3: "linear-gradient(135deg, #3b5b7d, #1a2b3d)",
  g4: "linear-gradient(135deg, #5a9660, #1f3a22)",
  g5: "linear-gradient(135deg, #8a5aa8, #3d2354)",
  g6: "linear-gradient(135deg, #1a1612, #403a31)",
};

export default function AdminCollectionEditor({
  collection,
  allSpots,
  memberIds,
}: {
  collection: {
    id: string;
    title: string;
    description: string | null;
    emoji: string | null;
    gradient: string;
    isPublished: boolean;
  };
  allSpots: Array<{ id: string; name: string; city: string; photoUrl: string | null }>;
  memberIds: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description ?? "");
  const [emoji, setEmoji] = useState(collection.emoji ?? "");
  const [gradient, setGradient] = useState(collection.gradient);
  const [isPublished, setIsPublished] = useState(collection.isPublished);
  const [members, setMembers] = useState<Set<string>>(new Set(memberIds));
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();

  function saveMeta() {
    startTransition(async () => {
      await updateCollection(collection.id, {
        title,
        description,
        emoji,
        gradient,
        isPublished,
      });
      showToast("Saved");
    });
  }

  function toggleSpot(spotId: string) {
    const isMember = members.has(spotId);
    // optimistic
    setMembers((cur) => {
      const next = new Set(cur);
      if (isMember) next.delete(spotId);
      else next.add(spotId);
      return next;
    });
    startTransition(async () => {
      try {
        if (isMember) await removeSpotFromCollection(collection.id, spotId);
        else await addSpotToCollection(collection.id, spotId);
      } catch {
        // revert
        setMembers((cur) => {
          const next = new Set(cur);
          if (isMember) next.add(spotId);
          else next.delete(spotId);
          return next;
        });
        showToast("Change failed");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${collection.title}"?`)) return;
    startTransition(async () => {
      await deleteCollection(collection.id);
      showToast("Deleted");
      router.push("/admin/collections");
    });
  }

  const filtered = allSpots.filter(
    (s) =>
      filter.trim() === "" ||
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.city.toLowerCase().includes(filter.toLowerCase())
  );

  const memberSpots = filtered.filter((s) => members.has(s.id));
  const nonMemberSpots = filtered.filter((s) => !members.has(s.id));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <Link
          href="/admin/collections"
          className="font-mono text-[11px] tracking-[.1em] text-[var(--ink-3)]"
        >
          ← LISTS
        </Link>
        <button
          onClick={handleDelete}
          className="text-[11.5px] text-[var(--crab)] font-bold"
        >
          Delete
        </button>
      </div>

      {/* Preview */}
      <div
        className="h-24 rounded-2xl relative overflow-hidden mb-4"
        style={{ background: GRAD_MAP[gradient] ?? GRAD_MAP.g1 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,.4) 100%)",
          }}
        />
        <div className="relative z-2 h-full p-3 flex flex-col justify-between text-white">
          <div className="text-2xl">{emoji || "✦"}</div>
          <div>
            <div className="font-display font-bold text-[16px] tracking-tight">
              {title || "Untitled list"}
            </div>
            <div className="font-mono text-[10px] opacity-80 mt-0.5">
              {members.size} {members.size === 1 ? "spot" : "spots"}
            </div>
          </div>
        </div>
      </div>

      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium"
        />
      </Field>
      <Field label="Description">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium"
        />
      </Field>
      <div className="grid grid-cols-[80px_1fr] gap-3">
        <Field label="Emoji">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[22px] text-center"
          />
        </Field>
        <Field label="Color">
          <div className="flex gap-2 h-11 items-center">
            {GRADIENTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGradient(g)}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: GRAD_MAP[g],
                  outline:
                    gradient === g ? "2px solid var(--ink)" : "none",
                  outlineOffset: "2px",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </Field>
      </div>

      <label className="flex items-center gap-2 my-3 text-[13px] font-semibold">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="w-4 h-4 accent-[var(--crab)]"
        />
        Published (visible on Lists tab)
      </label>

      <button
        onClick={saveMeta}
        disabled={pending}
        className="w-full h-11 bg-[var(--crab)] text-white rounded-full font-bold text-[13.5px] mb-5 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>

      <div className="font-display font-extrabold text-[17px] tracking-tight mb-2">
        Spots ({members.size})
      </div>

      <input
        placeholder="Search spots…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full h-10 bg-[var(--panel)] border border-[var(--border)] rounded-full px-4 text-[13.5px] font-medium mb-3"
      />

      {memberSpots.length > 0 && (
        <>
          <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5">
            In this list
          </div>
          {memberSpots.map((s) => (
            <SpotRow
              key={s.id}
              spot={s}
              inList
              onClick={() => toggleSpot(s.id)}
            />
          ))}
        </>
      )}

      {nonMemberSpots.length > 0 && (
        <>
          <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mt-4 mb-1.5">
            Add to list
          </div>
          {nonMemberSpots.map((s) => (
            <SpotRow
              key={s.id}
              spot={s}
              inList={false}
              onClick={() => toggleSpot(s.id)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function SpotRow({
  spot,
  inList,
  onClick,
}: {
  spot: { id: string; name: string; city: string; photoUrl: string | null };
  inList: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 p-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-xl mb-1.5 text-left"
    >
      <div
        className="w-10 h-10 rounded-lg bg-cover bg-center flex-shrink-0"
        style={{
          backgroundImage: spot.photoUrl ? `url(${spot.photoUrl})` : undefined,
          background: spot.photoUrl
            ? undefined
            : "linear-gradient(135deg, #e8c185, #6b4024)",
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-[14px] tracking-tight truncate">
          {spot.name}
        </div>
        <div className="text-[11.5px] text-[var(--ink-3)] truncate">{spot.city}</div>
      </div>
      <div
        style={{
          height: "28px",
          padding: "0 10px",
          borderRadius: "999px",
          background: inList ? "var(--ink)" : "var(--crab)",
          color: "#fff",
          fontSize: "11.5px",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {inList ? "Remove" : "+ Add"}
      </div>
    </button>
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
