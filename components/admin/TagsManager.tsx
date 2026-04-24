"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTag, deleteTag } from "@/lib/actions";
import { showToast } from "../Toast";

export default function TagsManager({
  tags: initialTags,
}: {
  tags: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [newLabel, setNewLabel] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    const label = newLabel.trim();
    if (!label) return;
    startTransition(async () => {
      try {
        const res = await createTag(label);
        setTags((cur) => [...cur, { id: res.id, label }]);
        setNewLabel("");
        showToast("Tag added");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this tag? Existing reviews keep their tags.")) return;
    startTransition(async () => {
      await deleteTag(id);
      setTags((cur) => cur.filter((t) => t.id !== id));
      showToast("Tag removed");
      router.refresh();
    });
  }

  return (
    <div className="p-4">
      <h2 className="font-display font-extrabold text-xl tracking-tight mb-3">
        Tags ({tags.length})
      </h2>
      <p className="text-[13px] text-[var(--ink-2)] mb-4 leading-[1.5]">
        These are the tags shown on the review form. Users pick from this list.
      </p>

      <div className="flex gap-2 mb-5">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="New tag (e.g. Old Bay heavy)"
          className="flex-1 h-11 bg-[var(--panel)] border border-[var(--border)] rounded-full px-4 text-[14px] font-medium"
        />
        <button
          onClick={add}
          disabled={pending || !newLabel.trim()}
          className="h-11 px-5 bg-[var(--crab)] text-white rounded-full font-bold text-[13.5px] disabled:opacity-60"
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <div
            key={t.id}
            className="h-9 pl-3 pr-1.5 rounded-full bg-[var(--panel)] border border-[var(--border-2)] flex items-center gap-1.5"
          >
            <span className="text-[13px] font-semibold">{t.label}</span>
            <button
              onClick={() => remove(t.id)}
              disabled={pending}
              className="w-6 h-6 rounded-full bg-[var(--bg-2)] text-[var(--ink-3)] flex items-center justify-center text-[14px] leading-none hover:bg-[var(--crab)] hover:text-white"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
