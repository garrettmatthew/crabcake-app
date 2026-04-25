"use client";

import { useMemo, useState } from "react";

export type SortBy =
  | "rank"
  | "boys"
  | "community"
  | "google"
  | "distance"
  | "newest";

const SORTS: Array<{ id: SortBy; label: string }> = [
  { id: "rank", label: "Top rated" },
  { id: "boys", label: "Boys" },
  { id: "community", label: "Community" },
  { id: "google", label: "Google" },
  { id: "distance", label: "Nearest" },
  { id: "newest", label: "Newest" },
];

/**
 * Filter + sort UI shown above the spots list. Multi-select tag chips,
 * single-select venue chip, single-select sort. State lives in the
 * parent (HomeMap) so the same controls drive both the map markers
 * and the list.
 */
export default function SpotFilterBar({
  venues,
  tags,
  selectedVenue,
  selectedTags,
  sortBy,
  hasUserLocation,
  totalCount,
  visibleCount,
  onVenueChange,
  onTagsChange,
  onSortChange,
  onClear,
}: {
  venues: string[];
  tags: string[];
  selectedVenue: string | null;
  selectedTags: string[];
  sortBy: SortBy;
  hasUserLocation: boolean;
  totalCount: number;
  visibleCount: number;
  onVenueChange: (v: string | null) => void;
  onTagsChange: (t: string[]) => void;
  onSortChange: (s: SortBy) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      (selectedVenue ? 1 : 0) +
      selectedTags.length +
      (sortBy !== "rank" ? 1 : 0),
    [selectedVenue, selectedTags, sortBy]
  );

  const sortLabel = SORTS.find((s) => s.id === sortBy)?.label ?? "Top rated";

  function toggleTag(t: string) {
    onTagsChange(
      selectedTags.includes(t)
        ? selectedTags.filter((x) => x !== t)
        : [...selectedTags, t]
    );
  }

  return (
    <div className="border-b border-[var(--border)] flex-shrink-0">
      {/* Compact bar — single row, always visible */}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto -mx-0">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="h-7 px-2.5 rounded-full font-mono text-[10.5px] tracking-[.04em] uppercase font-bold flex items-center gap-1 flex-shrink-0"
          style={{
            background:
              activeFilterCount > 0 ? "var(--crab)" : "var(--panel)",
            color: activeFilterCount > 0 ? "#fff" : "var(--ink-2)",
            border:
              activeFilterCount > 0
                ? "1px solid var(--crab)"
                : "1px solid var(--border)",
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {activeFilterCount > 0 ? `Filters · ${activeFilterCount}` : "Filter"}
        </button>
        <div
          className="text-[10.5px] tracking-[.04em] uppercase font-bold text-[var(--ink-3)] font-mono whitespace-nowrap flex-shrink-0"
          style={{ paddingLeft: 4 }}
        >
          {sortLabel}
        </div>
        {(activeFilterCount > 0 || visibleCount !== totalCount) && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto text-[10.5px] font-bold text-[var(--ink-3)] underline decoration-dotted underline-offset-2 flex-shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 bg-[var(--bg)]">
          {/* Sort */}
          <div>
            <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5">
              Sort
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SORTS.map((s) => {
                const disabled = s.id === "distance" && !hasUserLocation;
                const active = sortBy === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSortChange(s.id)}
                    className="h-7 px-2.5 rounded-full text-[11.5px] font-bold disabled:opacity-40"
                    style={{
                      background: active ? "var(--ink)" : "var(--panel)",
                      color: active ? "var(--bg)" : "var(--ink-2)",
                      border: active
                        ? "1px solid var(--ink)"
                        : "1px solid var(--border)",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Venue */}
          {venues.length > 0 && (
            <div>
              <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5">
                Venue type
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill
                  active={selectedVenue == null}
                  onClick={() => onVenueChange(null)}
                  label="All"
                />
                {venues.map((v) => (
                  <Pill
                    key={v}
                    active={selectedVenue === v}
                    onClick={() =>
                      onVenueChange(selectedVenue === v ? null : v)
                    }
                    label={v}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <div className="font-mono text-[9.5px] tracking-[.08em] uppercase text-[var(--ink-3)] font-semibold mb-1.5">
                Tags · spots whose reviews mention these
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Pill
                    key={t}
                    active={selectedTags.includes(t)}
                    onClick={() => toggleTag(t)}
                    label={t}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] text-[var(--ink-3)] font-medium pt-1">
            Showing {visibleCount} of {totalCount}
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 px-2.5 rounded-full text-[11.5px] font-bold"
      style={{
        background: active ? "var(--crab)" : "var(--panel)",
        color: active ? "#fff" : "var(--ink-2)",
        border: active ? "1px solid var(--crab)" : "1px solid var(--border)",
      }}
    >
      {label}
    </button>
  );
}
