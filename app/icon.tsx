import { ImageResponse } from "next/og";

// Tab favicon — Next renders this at request time and serves it from /icon.
export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#e83d35",
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 32 32" width="48" height="48" fill="#fff">
          <ellipse cx="16" cy="18" rx="7" ry="5.5" />
          <circle cx="13" cy="11" r="1.8" />
          <circle cx="19" cy="11" r="1.8" />
          <path d="M 2 16 Q 2 14 4 14 Q 7 14 9 16 L 9 17 L 6 17 Z" />
          <path d="M 2 20 Q 2 22 4 22 Q 7 22 9 20 L 9 19 L 6 19 Z" />
          <path d="M 30 16 Q 30 14 28 14 Q 25 14 23 16 L 23 17 L 26 17 Z" />
          <path d="M 30 20 Q 30 22 28 22 Q 25 22 23 20 L 23 19 L 26 19 Z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
