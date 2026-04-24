import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Crabcakes — every crab cake in America, ranked";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse at 20% 80%, rgba(228,178,72,.25), transparent 55%), radial-gradient(ellipse at 90% 10%, rgba(232,61,53,.2), transparent 55%), #f6f2ea",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px",
          fontFamily: "system-ui",
        }}
      >
        {/* Crab logo */}
        <div
          style={{
            width: "200px",
            height: "200px",
            borderRadius: "44px",
            background: "#e83d35",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 20px 60px -10px rgba(232,61,53,0.4)",
            marginBottom: "48px",
          }}
        >
          <svg
            width="140"
            height="140"
            viewBox="0 0 32 32"
            fill="#ffffff"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="16" cy="18" rx="7" ry="5.5" />
            <circle cx="13" cy="11" r="1.8" />
            <circle cx="19" cy="11" r="1.8" />
            <rect x="12.3" y="12.5" width="1.4" height="2.5" rx=".5" />
            <rect x="18.3" y="12.5" width="1.4" height="2.5" rx=".5" />
            <path d="M 2 16 Q 2 14 4 14 Q 7 14 9 16 L 9 17 L 6 17 Z" />
            <path d="M 2 20 Q 2 22 4 22 Q 7 22 9 20 L 9 19 L 6 19 Z" />
            <path d="M 30 16 Q 30 14 28 14 Q 25 14 23 16 L 23 17 L 26 17 Z" />
            <path d="M 30 20 Q 30 22 28 22 Q 25 22 23 20 L 23 19 L 26 19 Z" />
            <path
              d="M 10 22 L 8 26"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 13 23 L 12 27"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 19 23 L 20 27"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 22 22 L 24 26"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: "140px",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            color: "#1a1612",
            display: "flex",
          }}
        >
          Crabcakes<span style={{ color: "#e83d35" }}>.</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: "24px",
            fontSize: "36px",
            fontWeight: 500,
            color: "#403a31",
            letterSpacing: "-0.01em",
            display: "flex",
          }}
        >
          Every crab cake in America, ranked.
        </div>

        {/* Footer tag */}
        <div
          style={{
            marginTop: "40px",
            padding: "12px 24px",
            background: "#ffffff",
            border: "2px solid #e7e1d3",
            borderRadius: "999px",
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#78716a",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ color: "#e83d35" }}>✦</span>
          By the Baltimore Boys
          <span style={{ color: "#e83d35" }}>✦</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
