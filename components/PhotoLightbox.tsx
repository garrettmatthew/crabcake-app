"use client";

import { useEffect, useState } from "react";

/**
 * Click-to-expand image. Renders a small thumbnail; on click, opens a
 * full-screen overlay with the image centered. Tap anywhere or press
 * Escape to dismiss. Used on review cards.
 */
export default function PhotoLightbox({
  src,
  alt = "",
  className,
  style,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: "zoom-in",
          ...style,
        }}
        aria-label={alt || "View photo"}
      />
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[1100] flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.92)",
            cursor: "zoom-out",
            animation: "fadeIn .15s ease-out",
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* Image */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "94vw",
              maxHeight: "92vh",
              objectFit: "contain",
              borderRadius: 12,
              boxShadow: "0 30px 80px rgba(0,0,0,.5)",
            }}
          />
        </div>
      )}
    </>
  );
}
