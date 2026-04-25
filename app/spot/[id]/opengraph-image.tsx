import { ImageResponse } from "next/og";
import { getSpot } from "@/lib/queries";

export const runtime = "nodejs";
export const alt = "Crabcakes — every crab cake in America, ranked";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Per-spot OG card. When someone shares /spot/[id] in iMessage, Slack,
 * Twitter, etc. the preview shows the spot's photo, name, city, and
 * Boys + Community score side-by-side instead of the generic Crabcakes
 * card. Generated on demand and cached by the platform.
 */
export default async function SpotOpengraphImage({
  params,
}: {
  params: { id: string };
}) {
  const spot = await getSpot(params.id);
  const name = spot?.name ?? "Crabcakes";
  const city = spot?.city ?? "";
  const venueType = spot?.venueType ?? null;
  const boys =
    spot?.boysScore != null ? spot.boysScore.toFixed(1) : "—";
  const community =
    spot?.communityScore != null ? spot.communityScore.toFixed(1) : "—";
  const photo = spot?.photoUrl ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          background: "#f6f2ea",
          color: "#1a1612",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left column — branded text + scores */}
        <div
          style={{
            width: 600,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "#e83d35",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 32,
              }}
            >
              🦀
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              Crabcakes.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {venueType && (
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#e83d35",
                  fontWeight: 700,
                }}
              >
                {venueType}
              </div>
            )}
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                maxWidth: 480,
                display: "flex",
              }}
            >
              {name}
            </div>
            {city && (
              <div style={{ fontSize: 22, color: "#5a4f43", fontWeight: 500 }}>
                {city}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
            <ScoreColumn label="Boys" value={boys} accent="#e83d35" />
            <ScoreColumn label="Community" value={community} accent="#5a4f43" />
          </div>
        </div>

        {/* Right column — spot photo or branded fallback */}
        <div
          style={{
            width: 600,
            height: "100%",
            display: "flex",
            position: "relative",
            background: photo ? "#000" : "#e83d35",
          }}
        >
          {photo ? (
            // ImageResponse needs absolute URLs; spot.photoUrl is already an
            // absolute Vercel Blob URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              width={600}
              height={630}
              style={{ width: 600, height: 630, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 220,
              }}
            >
              🦀
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}

function ScoreColumn({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          fontSize: 13,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#8a7d6e",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 88,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}
