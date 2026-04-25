"use client";

import { useEffect, useState } from "react";

const VIDEO_RX = /\.(mp4|mov|webm|m4v)(\?|$)/i;

/**
 * Click-to-expand media. Detects video URLs and renders the right
 * element (img / video). Thumbnail uses an HTML video tag so the
 * first frame previews; tap opens the full-screen player. Same lightbox
 * UX as photos.
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
  const isVideo = VIDEO_RX.test(src);

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
          background: isVideo ? "#000" : undefined,
          backgroundImage: isVideo ? undefined : `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          cursor: "zoom-in",
          position: "relative",
          overflow: "hidden",
          ...style,
        }}
        aria-label={alt || (isVideo ? "Play video" : "View photo")}
      >
        {isVideo && (
          <>
            <video
              src={src}
              muted
              playsInline
              preload="metadata"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </span>
          </>
        )}
      </button>
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
          {/* Media */}
          {isVideo ? (
            <video
              src={src}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "94vw",
                maxHeight: "92vh",
                borderRadius: 12,
                boxShadow: "0 30px 80px rgba(0,0,0,.5)",
                background: "#000",
              }}
            />
          ) : (
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
          )}
        </div>
      )}
    </>
  );
}
