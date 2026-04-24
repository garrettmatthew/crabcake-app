"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCollection } from "@/lib/actions";
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

export default function CreateCollectionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🦀");
  const [gradient, setGradient] = useState<string>("g1");
  const [pending, startTransition] = useTransition();

  function create() {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createCollection({
        title,
        description: description || undefined,
        emoji: emoji || undefined,
        gradient,
      });
      showToast("List created");
      setOpen(false);
      setTitle("");
      setDescription("");
      setEmoji("🦀");
      setGradient("g1");
      router.push(`/admin/collections/${res.id}`);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-10 px-4 bg-[var(--crab)] text-white rounded-full font-bold text-[13px]"
      >
        + New list
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-end">
          <div className="bg-[var(--bg)] rounded-t-3xl w-full p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-extrabold text-xl tracking-tight">
                New list
              </h3>
              <button onClick={() => setOpen(false)} className="text-[var(--ink-3)]">
                ✕
              </button>
            </div>

            <div className="mb-3">
              <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5 pl-0.5">
                Title
              </div>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Broiled Only"
                className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium"
              />
            </div>

            <div className="mb-3">
              <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5 pl-0.5">
                Description
              </div>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="No breading, no frying, no excuses."
                className="w-full h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[14.5px] font-medium"
              />
            </div>

            <div className="mb-3">
              <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5 pl-0.5">
                Emoji
              </div>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={4}
                className="w-20 h-11 bg-[var(--panel)] border border-[var(--border)] rounded-xl px-3.5 text-[22px] text-center"
              />
            </div>

            <div className="mb-4">
              <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5 pl-0.5">
                Color
              </div>
              <div className="flex gap-2">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGradient(g)}
                    className={`w-10 h-10 rounded-xl ${
                      gradient === g ? "ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--bg)]" : ""
                    }`}
                    style={{ background: GRAD_MAP[g] }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={create}
              disabled={pending || !title.trim()}
              className="w-full h-12 bg-[var(--crab)] text-white rounded-full font-extrabold text-[15px] disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create list"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
