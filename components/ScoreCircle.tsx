export function scoreClass(s: number | null) {
  if (s == null) return "ok";
  if (s >= 9) return "elite";
  if (s >= 8) return "great";
  if (s >= 7) return "good";
  return "ok";
}

export default function ScoreCircle({
  score,
  size = "md",
  className = "",
}: {
  score: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const px = { sm: 34, md: 42, lg: 64, xl: 84 }[size];
  const font = { sm: 12, md: 14, lg: 22, xl: 28 }[size];
  return (
    <div
      className={`ring ${scoreClass(score)} ${className}`}
      style={{ width: px, height: px, fontSize: font }}
    >
      {score == null ? "—" : score.toFixed(1)}
    </div>
  );
}
