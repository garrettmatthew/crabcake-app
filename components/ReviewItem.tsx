import { scoreClass } from "./ScoreCircle";

type Review = {
  id: string;
  score: string;
  note: string | null;
  tags: string[] | null;
  createdAt: Date | string;
  userName: string | null;
  avatarSwatch: string | null;
};

export default function ReviewItem({ review }: { review: Review }) {
  const score = parseFloat(review.score);
  const initials = (review.userName ?? "AN")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const date = new Date(review.createdAt);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const gradient =
    {
      g1: "linear-gradient(135deg, var(--crab), var(--gold))",
      g2: "linear-gradient(135deg, #5a89c8, #8a5aa8)",
      g3: "linear-gradient(135deg, var(--green), #3b5b7d)",
      g4: "linear-gradient(135deg, var(--ink), #403a31)",
    }[review.avatarSwatch ?? "g1"] || "linear-gradient(135deg, var(--crab), var(--gold))";

  return (
    <div className="border-t border-[var(--border)] py-2.5 first:border-t-0 first:pt-0">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: gradient }}
          >
            {initials}
          </div>
          <div>
            <div className="text-[12.5px] font-semibold">{review.userName ?? "Anonymous"}</div>
            <div className="font-mono text-[10px] text-[var(--ink-3)]">{dateStr}</div>
          </div>
        </div>
        <div
          className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-display font-extrabold text-xs text-white ${scoreClass(
            score
          )}`}
          style={
            score >= 9
              ? { background: "var(--gold)", color: "var(--ink)" }
              : score >= 8
                ? { background: "var(--crab)" }
                : score >= 7
                  ? { background: "#c98551" }
                  : { background: "var(--ink-3)" }
          }
        >
          {score.toFixed(1)}
        </div>
      </div>
      {review.note && (
        <div className="text-[13px] text-[var(--ink-2)] leading-[1.4]">{review.note}</div>
      )}
    </div>
  );
}
