import { ImageResponse } from "next/og";
import { getRatingById } from "@/lib/queries";

export const runtime = "nodejs";
export const alt = "A take on Crabcakes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function RatingOpengraphImage({
  params,
}: {
  params: { id: string };
}) {
  const r = await getRatingById(params.id);
  const score = r ? parseFloat(r.score).toFixed(1) : "—";
  const isBoys = Boolean(r?.isBoysReview);
  const reviewer = r?.userName ?? "A Baltimore local";
  const spotName = r?.spotName ?? "Crabcakes";
  const note = r?.note ?? "";
  const photo =
    r?.photoUrls?.[0] ?? r?.photoUrl ?? r?.spotPhoto ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f6f2ea",
          color: "#1a1612",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 700,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
          }}
        >
          <div
            style={{
              fontSize: 14,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: isBoys ? "#e83d35" : "#5a4f43",
            }}
          >
            {isBoys ? "Official Boys Take" : "Community Take"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#5a4f43",
              }}
            >
              {reviewer} on
            </div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                display: "flex",
              }}
            >
              {spotName}
            </div>
            {note && (
              <div
                style={{
                  fontSize: 24,
                  fontStyle: "italic",
                  color: "#5a4f43",
                  borderLeft: "3px solid #e83d35",
                  paddingLeft: 16,
                  marginTop: 8,
                  display: "flex",
                  maxWidth: 580,
                }}
              >
                {note.length > 140 ? note.slice(0, 137) + "…" : note}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: "50%",
                background: "#e83d35",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              {score}
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#5a4f43",
                fontWeight: 600,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div>out of 10</div>
              <div style={{ color: "#1a1612", fontWeight: 800 }}>Crabcakes.</div>
            </div>
          </div>
        </div>
        <div
          style={{
            width: 500,
            display: "flex",
            background: photo ? "#000" : "#e83d35",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              width={500}
              height={630}
              style={{ width: 500, height: 630, objectFit: "cover" }}
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
