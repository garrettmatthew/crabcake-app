"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SpotWithStats } from "@/lib/queries";
import { scoreClass } from "./ScoreCircle";
import SpotFilterBar, { type SortBy } from "./SpotFilterBar";

type LRef = typeof import("leaflet");
type MapRef = import("leaflet").Map;

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function HomeMap({ spots }: { spots: SpotWithStats[] }) {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef | null>(null);
  const tileRef = useRef<import("leaflet").TileLayer | null>(null);
  const [selectedId, setSelectedId] = useState<string>(spots[0]?.id ?? "");
  const [sheetState, setSheetState] = useState<"peek" | "mid" | "expanded">("mid");

  // Filter + sort state — drives the list (the map keeps showing every
  // spot so you can still discover by panning / zooming).
  const [sortBy, setSortBy] = useState<SortBy>("rank");
  const [venueFilter, setVenueFilter] = useState<string | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // Distinct venue types + tag union, sorted by frequency.
  const venues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of spots) {
      if (s.venueType) counts.set(s.venueType, (counts.get(s.venueType) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  }, [spots]);

  const tagPool = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of spots) {
      for (const t of s.allTags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  }, [spots]);

  // Compute filtered + sorted display list.
  const displaySpots = useMemo(() => {
    let out = spots;
    if (venueFilter) {
      out = out.filter((s) => s.venueType === venueFilter);
    }
    if (tagFilters.length > 0) {
      out = out.filter((s) =>
        tagFilters.every((t) => s.allTags.includes(t))
      );
    }
    const cmp: Record<SortBy, (a: SpotWithStats, b: SpotWithStats) => number> = {
      rank: () => 0, // already sorted by listSpots
      boys: (a, b) =>
        (b.boysScore ?? -Infinity) - (a.boysScore ?? -Infinity),
      community: (a, b) =>
        (b.communityScore ?? -Infinity) - (a.communityScore ?? -Infinity),
      google: (a, b) =>
        (b.googleRating ?? -Infinity) - (a.googleRating ?? -Infinity),
      distance: (a, b) => {
        if (!userLoc) return 0;
        return (
          haversineKm(userLoc, { lat: a.latitude, lng: a.longitude }) -
          haversineKm(userLoc, { lat: b.latitude, lng: b.longitude })
        );
      },
      newest: (a, b) => b.recentRatingCount - a.recentRatingCount,
    };
    if (sortBy !== "rank") {
      out = [...out].sort(cmp[sortBy]);
    }
    return out;
  }, [spots, venueFilter, tagFilters, sortBy, userLoc]);

  function clearFilters() {
    setSortBy("rank");
    setVenueFilter(null);
    setTagFilters([]);
  }

  // Init Leaflet
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L: LRef = await import("leaflet");
      if (cancelled || !mapEl.current) return;

      // Fix default icons (not used — we use divIcons)
      const map = L.map(mapEl.current, {
        center: [39.5, -92],
        zoom: 4,
        zoomControl: false,
        attributionControl: true,
        maxBounds: [
          [15, -145],
          [55, -55],
        ],
        maxBoundsViscosity: 1,
      });
      mapRef.current = map;

      // Ask for user location; center & zoom if granted.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setUserLoc({ lat: latitude, lng: longitude });
            // Only auto-fly if the location is within US bounds
            if (
              latitude >= 15 &&
              latitude <= 55 &&
              longitude >= -145 &&
              longitude <= -55
            ) {
              // Pixel-stable divIcon with pulsing ring (doesn't scale with zoom)
              const dot = L.divIcon({
                className: "marker-container",
                html: `<div class="location-dot-wrap"><div class="location-dot-pulse"></div><div class="location-dot-core"></div></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              });
              L.marker([latitude, longitude], {
                icon: dot,
                interactive: false,
                keyboard: false,
              }).addTo(map);
              map.flyTo([latitude, longitude], 11, { duration: 1.2 });
            }
          },
          () => {
            /* permission denied — keep USA default */
          },
          { timeout: 6000, maximumAge: 5 * 60 * 1000 }
        );
      }

      const tileUrl =
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

      tileRef.current = L.tileLayer(tileUrl, {
        attribution: "© OpenStreetMap · © CARTO",
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      // Cluster overlapping pins. Once spots get dense in a city, the map
      // shows a single bubble with the count instead of a fan of pins. Click
      // expands to the children.
      await import("leaflet.markercluster");
      const Lany = L as unknown as {
        markerClusterGroup: (opts: object) => import("leaflet").Layer & {
          addLayer: (m: import("leaflet").Layer) => void;
        };
      };
      const cluster = Lany.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 36,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 14,
        iconCreateFunction: (c: { getChildCount: () => number }) => {
          const count = c.getChildCount();
          return L.divIcon({
            className: "marker-container",
            html: `<div class="marker-cluster">${count}</div>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          });
        },
      });
      map.addLayer(cluster);

      // Add markers — Boys score if available, else Google rating with star pip
      for (const s of spots) {
        const savedBadge = s.isSaved
          ? '<div class="saved-badge"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>'
          : "";
        let html: string;
        if (s.boysScore != null) {
          const cls = scoreClass(s.boysScore);
          html = `<div class="marker-pin ${cls}">${s.boysScore.toFixed(1)}${savedBadge}</div>`;
        } else if (s.googleRating != null) {
          // Google fallback — display on /10 scale (×2) so it's comparable to Boys
          const onTen = (s.googleRating * 2).toFixed(1);
          html =
            `<div class="marker-pin marker-google" style="background:var(--panel);color:var(--ink);border-color:var(--border-2);font-size:13px;">` +
            onTen +
            savedBadge +
            "</div>";
        } else {
          html = `<div class="marker-pin ok">—${savedBadge}</div>`;
        }
        const icon = L.divIcon({
          className: "marker-container",
          html,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        const m = L.marker([s.latitude, s.longitude], { icon, title: s.name });
        m.on("click", () => {
          setSelectedId(s.id);
          router.push(`/spot/${s.id}`);
        });
        cluster.addLayer(m);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [spots]);

  // Drag handle gesture
  const handleRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = handleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet) return;

    let pointerId: number | null = null;
    let startY = 0;
    let startTop = 0;
    let dragged = false;

    function onDown(e: PointerEvent) {
      pointerId = e.pointerId;
      try {
        handle!.setPointerCapture(e.pointerId);
      } catch {}
      startY = e.clientY;
      startTop = sheet!.getBoundingClientRect().top;
      sheet!.style.transition = "none";
      dragged = false;
    }

    function onMove(e: PointerEvent) {
      if (pointerId == null || pointerId !== e.pointerId) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 4) dragged = true;
      if (!dragged) return;
      const parent = sheet!.parentElement!.getBoundingClientRect();
      const offsetInParent = startTop + dy - parent.top;
      const clamped = Math.max(0, Math.min(parent.height - 80, offsetInParent));
      sheet!.style.transform = `translateY(${clamped}px)`;
      e.preventDefault();
    }

    function onUp(e: PointerEvent) {
      if (pointerId == null || pointerId !== e.pointerId) return;
      try {
        handle!.releasePointerCapture(e.pointerId);
      } catch {}
      pointerId = null;
      sheet!.style.transition = "";

      if (!dragged) {
        // Pure tap → cycle through states
        setSheetState((s) =>
          s === "peek" ? "mid" : s === "mid" ? "expanded" : "peek"
        );
        return;
      }
      const parent = sheet!.parentElement!.getBoundingClientRect();
      const top = sheet!.getBoundingClientRect().top - parent.top;
      const pct = top / parent.height;
      sheet!.style.transform = "";
      if (pct < 0.18) setSheetState("expanded");
      else if (pct < 0.55) setSheetState("mid");
      else setSheetState("peek");
    }

    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);

    // Also: overscroll-pull-down on the list — if list is at scrollTop=0
    // and user pulls down, treat it as a sheet drag.
    const list = listRef.current;
    let listPointerId: number | null = null;
    let listStartY = 0;
    let listStartTop = 0;
    let listDragging = false;

    function listDown(e: PointerEvent) {
      // Only consider touch / pen drags (mouse uses scroll wheel)
      if (e.pointerType === "mouse") return;
      if (list!.scrollTop > 0) return; // user is scrolling list, not sheet
      listPointerId = e.pointerId;
      listStartY = e.clientY;
      listStartTop = sheet!.getBoundingClientRect().top;
      listDragging = false;
    }

    function listMove(e: PointerEvent) {
      if (listPointerId == null || listPointerId !== e.pointerId) return;
      const dy = e.clientY - listStartY;
      // Only intercept when pulling DOWN (positive dy), and list still at top
      if (dy <= 4 || list!.scrollTop > 0) {
        if (listDragging) {
          // User started dragging then scrolled up — release control
          listDragging = false;
          sheet!.style.transition = "";
          sheet!.style.transform = "";
        }
        return;
      }
      if (!listDragging) {
        listDragging = true;
        try {
          list!.setPointerCapture(e.pointerId);
        } catch {}
        sheet!.style.transition = "none";
      }
      const parent = sheet!.parentElement!.getBoundingClientRect();
      const offsetInParent = listStartTop + dy - parent.top;
      const clamped = Math.max(0, Math.min(parent.height - 80, offsetInParent));
      sheet!.style.transform = `translateY(${clamped}px)`;
      e.preventDefault();
    }

    function listUp(e: PointerEvent) {
      if (listPointerId == null || listPointerId !== e.pointerId) return;
      try {
        list!.releasePointerCapture(e.pointerId);
      } catch {}
      const wasDragging = listDragging;
      listPointerId = null;
      listDragging = false;
      if (!wasDragging) return;
      sheet!.style.transition = "";
      const parent = sheet!.parentElement!.getBoundingClientRect();
      const top = sheet!.getBoundingClientRect().top - parent.top;
      const pct = top / parent.height;
      sheet!.style.transform = "";
      if (pct < 0.18) setSheetState("expanded");
      else if (pct < 0.55) setSheetState("mid");
      else setSheetState("peek");
    }

    if (list) {
      list.addEventListener("pointerdown", listDown);
      list.addEventListener("pointermove", listMove);
      list.addEventListener("pointerup", listUp);
      list.addEventListener("pointercancel", listUp);
    }

    return () => {
      handle.removeEventListener("pointerdown", onDown);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      if (list) {
        list.removeEventListener("pointerdown", listDown);
        list.removeEventListener("pointermove", listMove);
        list.removeEventListener("pointerup", listUp);
        list.removeEventListener("pointercancel", listUp);
      }
    };
  }, []);

  const sheetTransform = {
    peek: "translateY(calc(100% - 150px))",
    mid: "translateY(40%)",
    expanded: "translateY(0)",
  }[sheetState];

  return (
    <div className="flex-1 relative min-h-0 overflow-hidden">
      <div
        ref={mapEl}
        className="w-full h-full"
        style={{ background: "var(--bg-2)" }}
      />

      {/* Map float buttons */}
      <div className="absolute top-3 right-3 z-[4] flex flex-col gap-1.5">
        <button
          onClick={() => {
            if (navigator.geolocation && mapRef.current) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  mapRef.current?.flyTo(
                    [pos.coords.latitude, pos.coords.longitude],
                    12,
                    { duration: 1 }
                  );
                },
                () => {
                  mapRef.current?.flyTo([39.29, -76.61], 10, { duration: 1.2 });
                }
              );
            }
          }}
          className="w-10 h-10 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center text-[var(--ink-2)] shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-10 h-10 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center text-[var(--ink-2)] shadow-md"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-10 h-10 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center text-[var(--ink-2)] shadow-md"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Bottom sheet — stops above the tab bar */}
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 rounded-t-3xl shadow-[0_-12px_32px_rgba(40,30,20,.15)] flex flex-col"
        style={{
          bottom: "64px", // matches tab bar height
          background: "var(--panel)",
          height: "calc(70% - 64px)",
          transform: sheetTransform,
          transition: "transform .3s cubic-bezier(.2,.7,.3,1)",
          zIndex: 400,
        }}
      >
        {/* Whole top region (handle + title row) is the drag zone */}
        <div
          ref={handleRef}
          className="cursor-grab select-none flex-shrink-0"
          style={{ touchAction: "none" }}
        >
          <div className="py-2.5 flex justify-center">
            <div className="w-11 h-[5px] rounded-full bg-[var(--border-2)]" />
          </div>
          <div className="px-4 pb-3 flex justify-between items-end border-b border-[var(--border)]">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Top rated · USA</h2>
              <div className="text-[11.5px] text-[var(--ink-3)] font-medium mt-0.5">
                {displaySpots.length === spots.length
                  ? `${spots.length} spots`
                  : `${displaySpots.length} of ${spots.length} spots`}
              </div>
            </div>
            <span className="text-xs font-semibold text-[var(--crab)]">Top ↓</span>
          </div>
        </div>

        <SpotFilterBar
          venues={venues}
          tags={tagPool}
          selectedVenue={venueFilter}
          selectedTags={tagFilters}
          sortBy={sortBy}
          hasUserLocation={userLoc != null}
          totalCount={spots.length}
          visibleCount={displaySpots.length}
          onVenueChange={setVenueFilter}
          onTagsChange={setTagFilters}
          onSortChange={setSortBy}
          onClear={clearFilters}
        />

        <div ref={listRef} className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2">
          {displaySpots.length === 0 ? (
            <div className="text-center py-10 text-[13px] text-[var(--ink-3)]">
              No spots match these filters.{" "}
              <button
                onClick={clearFilters}
                className="font-bold text-[var(--crab)] underline decoration-dotted underline-offset-2"
              >
                Clear
              </button>
            </div>
          ) : (
            displaySpots.map((s, i) => (
            <Link
              href={`/spot/${s.id}`}
              key={s.id}
              className={`grid gap-3 p-2.5 rounded-xl items-center mb-0.5 active:bg-[var(--panel-2)] ${
                selectedId === s.id ? "bg-[var(--panel-2)]" : ""
              }`}
              style={{ gridTemplateColumns: "60px 1fr auto" }}
            >
              <div
                className="relative w-15 h-15 rounded-xl bg-cover bg-center flex-shrink-0"
                style={{
                  width: 60,
                  height: 60,
                  backgroundImage: s.photoUrl ? `url(${s.photoUrl})` : undefined,
                  background: s.photoUrl
                    ? undefined
                    : "linear-gradient(135deg, #e8c185, #6b4024)",
                }}
              >
                <div className="absolute top-1 left-1 w-[18px] h-[18px] rounded-md flex items-center justify-center font-mono text-[9px] text-white font-bold" style={{ background: "rgba(26,22,18,.85)", backdropFilter: "blur(4px)" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-[14.5px] tracking-tight leading-[1.15] truncate">
                  {s.name}
                </div>
                <div className="text-[11.5px] text-[var(--ink-3)] font-medium mt-0.5 truncate">
                  {s.city}
                  {s.neighborhood ? (
                    <>
                      <span className="opacity-50 mx-1">·</span>
                      {s.neighborhood}
                    </>
                  ) : null}
                </div>
                {s.style || s.prep ? (
                  <div className="flex gap-1 mt-1.5">
                    {s.style && (
                      <span className="font-mono text-[8.5px] px-1.5 py-0.5 bg-[var(--bg-2)] rounded text-[var(--ink-3)] font-medium">
                        {s.style.toUpperCase()}
                      </span>
                    )}
                    {s.prep && (
                      <span className="font-mono text-[8.5px] px-1.5 py-0.5 bg-[var(--bg-2)] rounded text-[var(--ink-3)] font-medium">
                        {s.prep.toUpperCase()}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
              {s.boysScore != null ? (
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className={`ring ${scoreClass(s.boysScore)}`}
                    style={{ width: 42, height: 42, fontSize: 14 }}
                  >
                    {s.boysScore.toFixed(1)}
                  </div>
                  <div className="font-mono text-[8px] tracking-[.06em] uppercase text-[var(--ink-3)] font-semibold">
                    BOYS
                  </div>
                </div>
              ) : s.googleRating != null ? (
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "var(--bg-2)",
                      border: "1.5px solid var(--border-2)",
                    }}
                  >
                    <span className="font-display font-extrabold text-[14px] tracking-tight text-[var(--ink)]">
                      {(s.googleRating * 2).toFixed(1)}
                    </span>
                  </div>
                  <div
                    className="font-mono text-[8px] tracking-[.06em] uppercase font-semibold flex items-center gap-0.5"
                    style={{ color: "var(--ink-3)" }}
                  >
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="#fbbc04">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    GOOGLE
                  </div>
                </div>
              ) : (
                <div
                  className="ring ok"
                  style={{ width: 42, height: 42, fontSize: 14 }}
                >
                  —
                </div>
              )}
            </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
