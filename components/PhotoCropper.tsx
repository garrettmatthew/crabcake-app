"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Square photo cropper. Renders the picked image inside a fixed-size
 * viewport with a 1:1 crop window. The user pans (drag / one-finger
 * touch) and zooms (pinch / wheel / +/- buttons) to choose the part
 * they want. On confirm, the visible crop is rendered to a canvas and
 * returned as a JPEG Blob.
 *
 * Handles EXIF orientation: iPhone photos are stored landscape with a
 * rotate flag. Canvas doesn't auto-rotate, so we use createImageBitmap
 * with imageOrientation: 'from-image' to get a properly-oriented bitmap
 * before drawing.
 *
 * Self-contained — no external dependency. Built on pointer events and
 * a 2D canvas.
 */
export default function PhotoCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: Blob) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Bitmap with EXIF orientation already applied — used for canvas crop.
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  // Pan + zoom state. translate is in CSS px relative to the viewport center.
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Viewport size — we set this from the container after mount.
  const [viewport, setViewport] = useState(320);

  // Pointer state for drag + pinch tracking.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{ tx: number; ty: number; x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    // Build an oriented ImageBitmap in parallel — used by canvas crop.
    let cancelled = false;
    if (typeof createImageBitmap === "function") {
      createImageBitmap(file, { imageOrientation: "from-image" })
        .then((bm) => {
          if (cancelled) {
            bm.close?.();
            return;
          }
          bitmapRef.current = bm;
          // Override naturalSize from the oriented bitmap so cropper math
          // matches what the user actually sees.
          setNaturalSize({ w: bm.width, h: bm.height });
        })
        .catch(() => {
          /* fall back to the <img> tag's naturalSize on load */
        });
    }
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
      bitmapRef.current?.close?.();
      bitmapRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    function measure() {
      const el = containerRef.current;
      if (!el) return;
      const w = Math.min(el.clientWidth, 480);
      setViewport(w);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    imgRef.current = img;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    // Initial scale: cover the viewport (image fills the square).
    const cover = Math.max(viewport / img.naturalWidth, viewport / img.naturalHeight);
    setScale(cover);
    setTx(0);
    setTy(0);
    setImgLoaded(true);
  }

  // After viewport changes (e.g. after image load), recompute initial cover.
  useEffect(() => {
    if (!imgLoaded || naturalSize.w === 0) return;
    const cover = Math.max(viewport / naturalSize.w, viewport / naturalSize.h);
    setScale((s) => (s < cover ? cover : s));
  }, [viewport, imgLoaded, naturalSize]);

  function clampTranslate(nextTx: number, nextTy: number, s: number) {
    // Don't let the user pan past the edges of the image.
    const halfImgW = (naturalSize.w * s) / 2;
    const halfImgH = (naturalSize.h * s) / 2;
    const halfV = viewport / 2;
    const maxX = Math.max(0, halfImgW - halfV);
    const maxY = Math.max(0, halfImgH - halfV);
    return {
      tx: Math.max(-maxX, Math.min(maxX, nextTx)),
      ty: Math.max(-maxY, Math.min(maxY, nextTy)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      dragStartRef.current = { tx, ty, x: e.clientX, y: e.clientY };
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartRef.current = { dist, scale };
      dragStartRef.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1 && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const next = clampTranslate(dragStartRef.current.tx + dx, dragStartRef.current.ty + dy, scale);
      setTx(next.tx);
      setTy(next.ty);
    } else if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const minScale = Math.max(viewport / naturalSize.w, viewport / naturalSize.h);
      const nextScale = Math.max(
        minScale,
        Math.min(8, pinchStartRef.current.scale * (dist / pinchStartRef.current.dist))
      );
      setScale(nextScale);
      const clamped = clampTranslate(tx, ty, nextScale);
      setTx(clamped.tx);
      setTy(clamped.ty);
    }
  }

  function onPointerEnd(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) dragStartRef.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    if (!naturalSize.w) return;
    const delta = -e.deltaY * 0.0015;
    const minScale = Math.max(viewport / naturalSize.w, viewport / naturalSize.h);
    const nextScale = Math.max(minScale, Math.min(8, scale * (1 + delta)));
    setScale(nextScale);
    const clamped = clampTranslate(tx, ty, nextScale);
    setTx(clamped.tx);
    setTy(clamped.ty);
  }

  function adjustZoom(deltaPct: number) {
    if (!naturalSize.w) return;
    const minScale = Math.max(viewport / naturalSize.w, viewport / naturalSize.h);
    const nextScale = Math.max(minScale, Math.min(8, scale * (1 + deltaPct)));
    setScale(nextScale);
    const clamped = clampTranslate(tx, ty, nextScale);
    setTx(clamped.tx);
    setTy(clamped.ty);
  }

  async function confirm() {
    if (!naturalSize.w) return;

    // Source rect in oriented-image-natural pixels.
    const srcSize = viewport / scale;
    const cxSrc = naturalSize.w / 2 - tx / scale;
    const cySrc = naturalSize.h / 2 - ty / scale;
    // Clamp so the source rect is fully inside the image. Without the
    // upper bound, drawImage was sampling past the edges and the dest
    // was getting visually squashed/stretched.
    const maxSx = Math.max(0, naturalSize.w - srcSize);
    const maxSy = Math.max(0, naturalSize.h - srcSize);
    const sx = Math.max(0, Math.min(maxSx, cxSrc - srcSize / 2));
    const sy = Math.max(0, Math.min(maxSy, cySrc - srcSize / 2));

    // Output at the source-pixel resolution (capped at 1600) so the
    // saved photo has real detail instead of being upsampled later.
    const out = Math.min(1600, Math.round(srcSize));
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";

    // Prefer the orientation-corrected bitmap. Fall back to the <img>
    // element if createImageBitmap wasn't available — output may be
    // mis-rotated on iOS but at least won't be stretched.
    const source = bitmapRef.current ?? imgRef.current;
    if (!source) return;
    ctx.drawImage(
      source as CanvasImageSource,
      sx,
      sy,
      srcSize,
      srcSize,
      0,
      0,
      out,
      out
    );

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (blob) onConfirm(blob);
  }

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col" style={{ background: "rgba(0,0,0,0.9)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button
          type="button"
          onClick={onCancel}
          className="font-semibold text-[14.5px]"
        >
          Cancel
        </button>
        <div className="font-display font-bold text-[15px]">Crop</div>
        <button
          type="button"
          onClick={confirm}
          disabled={!imgLoaded}
          className="font-semibold text-[14.5px] disabled:opacity-50"
          style={{ color: "var(--gold)" }}
        >
          Use photo
        </button>
      </div>

      {/* Crop viewport */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center px-4 select-none"
        style={{ touchAction: "none" }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onWheel={onWheel}
          className="relative overflow-hidden rounded-2xl"
          style={{
            width: viewport,
            height: viewport,
            background: "#111",
            cursor: "grab",
          }}
        >
          {imgUrl && (
            <img
              src={imgUrl}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: naturalSize.w * scale,
                height: naturalSize.h * scale,
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`,
                userSelect: "none",
                pointerEvents: "none",
                // Make sure portrait photos display rotated like in
                // Photos / Files, matching what the canvas crop bitmap
                // produces.
                imageOrientation: "from-image",
              }}
            />
          )}
          {/* Outline so the user knows what's getting saved */}
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.85)" }}
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="px-4 pb-6 pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => adjustZoom(-0.18)}
          className="w-11 h-11 rounded-full text-white text-xl font-bold"
          style={{ background: "rgba(255,255,255,0.15)" }}
          aria-label="Zoom out"
        >
          −
        </button>
        <div className="flex-1 text-center text-[12px] text-white/70">
          Drag to position · pinch / scroll to zoom
        </div>
        <button
          type="button"
          onClick={() => adjustZoom(0.18)}
          className="w-11 h-11 rounded-full text-white text-xl font-bold"
          style={{ background: "rgba(255,255,255,0.15)" }}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
