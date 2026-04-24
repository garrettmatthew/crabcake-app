"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SpotWithStats } from "@/lib/queries";
import { scoreClass } from "./ScoreCircle";

type LRef = typeof import("leaflet");
type MapRef = import("leaflet").Map;

export default function HomeMap({ spots }: { spots: SpotWithStats[] }) {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef | null>(null);
  const tileRef = useRef<import("leaflet").TileLayer | null>(null);
  const [selectedId, setSelectedId] = useState<string>(spots[0]?.id ?? "");
  const [sheetState, setSheetState] = useState<"peek" | "mid" | "expanded">("mid");

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

      // Baltimore "home" ring
      L.marker([39.2904, -76.6122], {
        icon: L.divIcon({
          className: "marker-container",
          html: `<div style="width:80px;height:80px;border:2px dashed var(--crab);background:rgba(232,61,53,.1);border-radius:50%;"></div>`,
          iconSize: [80, 80],
          iconAnchor: [40, 40],
        }),
        interactive: false,
        keyboard: false,
      }).addTo(map);

      // Add markers
      for (const s of spots) {
        const cls = scoreClass(s.boysScore);
        const savedBadge = s.isSaved
          ? '<div class="saved-badge"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>'
          : "";
        const label = s.boysScore != null ? s.boysScore.toFixed(1) : "—";
        const icon = L.divIcon({
          className: "marker-container",
          html: `<div class="marker-pin ${cls}">${label}${savedBadge}</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        const m = L.marker([s.latitude, s.longitude], { icon, title: s.name }).addTo(map);
        m.on("click", () => {
          setSelectedId(s.id);
          router.push(`/spot/${s.id}`);
        });
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

  useEffect(() => {
    const handle = handleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet) return;

    let dragging = false;
    let startY = 0;
    let startTop = 0;

    function start(e: MouseEvent | TouchEvent) {
      dragging = true;
      const y = "touches" in e ? e.touches[0].clientY : e.clientY;
      startY = y;
      startTop = sheet!.getBoundingClientRect().top;
      sheet!.style.transition = "none";
      if (e.cancelable) e.preventDefault();
    }
    function move(e: MouseEvent | TouchEvent) {
      if (!dragging) return;
      const y = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dy = y - startY;
      const parent = sheet!.parentElement!.getBoundingClientRect();
      const offsetInParent = startTop + dy - parent.top;
      const clamped = Math.max(0, Math.min(parent.height - 80, offsetInParent));
      sheet!.style.transform = `translateY(${clamped}px)`;
      if (e.cancelable) e.preventDefault();
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      sheet!.style.transition = "";
      const parent = sheet!.parentElement!.getBoundingClientRect();
      const top = sheet!.getBoundingClientRect().top - parent.top;
      const pct = top / parent.height;
      sheet!.style.transform = "";
      if (pct < 0.15) setSheetState("expanded");
      else if (pct < 0.55) setSheetState("mid");
      else setSheetState("peek");
    }

    handle.addEventListener("mousedown", start);
    handle.addEventListener("touchstart", start, { passive: false });
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", end);
    window.addEventListener("touchend", end);
    return () => {
      handle.removeEventListener("mousedown", start);
      handle.removeEventListener("touchstart", start);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchend", end);
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

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 bottom-0 bg-[var(--panel)] rounded-t-3xl shadow-[0_-12px_32px_rgba(40,30,20,.15)] z-[400] flex flex-col"
        style={{
          height: "70%",
          transform: sheetTransform,
          transition: "transform .3s cubic-bezier(.2,.7,.3,1)",
        }}
      >
        <div
          ref={handleRef}
          className="py-2.5 flex justify-center cursor-grab select-none flex-shrink-0"
          onClick={() => {
            setSheetState((s) => (s === "peek" ? "mid" : s === "mid" ? "expanded" : "peek"));
          }}
        >
          <div className="w-11 h-[5px] rounded-full bg-[var(--border-2)]" />
        </div>

        <div className="px-4 pb-3 flex justify-between items-end border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Top rated · USA</h2>
            <div className="text-[11.5px] text-[var(--ink-3)] font-medium mt-0.5">
              {spots.length} spots · sorted by Boys ↓
            </div>
          </div>
          <span className="text-xs font-semibold text-[var(--crab)]">Boys ↓</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 pb-20 pt-2">
          {spots.map((s, i) => (
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
              <div
                className={`ring ${scoreClass(s.boysScore)}`}
                style={{ width: 42, height: 42, fontSize: 14 }}
              >
                {s.boysScore == null ? "—" : s.boysScore.toFixed(1)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
