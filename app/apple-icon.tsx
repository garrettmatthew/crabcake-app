import { ImageResponse } from "next/og";

// iOS home-screen icon — when a user "Adds to Home Screen" the device
// fetches /apple-icon and uses it for the launcher tile. 180x180 is
// Apple's recommended touch-icon size.
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#e83d35",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 32 32" width="148" height="148" fill="#fff">
          <ellipse cx="16" cy="18" rx="7" ry="5.5" />
          <circle cx="13" cy="11" r="1.8" />
          <circle cx="19" cy="11" r="1.8" />
          <rect x="12.3" y="12.5" width="1.4" height="2.5" rx=".5" />
          <rect x="18.3" y="12.5" width="1.4" height="2.5" rx=".5" />
          <path d="M 2 16 Q 2 14 4 14 Q 7 14 9 16 L 9 17 L 6 17 Z" />
          <path d="M 2 20 Q 2 22 4 22 Q 7 22 9 20 L 9 19 L 6 19 Z" />
          <path d="M 30 16 Q 30 14 28 14 Q 25 14 23 16 L 23 17 L 26 17 Z" />
          <path d="M 30 20 Q 30 22 28 22 Q 25 22 23 20 L 23 19 L 26 19 Z" />
          <g stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M 10 22 L 8 26" />
            <path d="M 13 23 L 12 27" />
            <path d="M 19 23 L 20 27" />
            <path d="M 22 22 L 24 26" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}
