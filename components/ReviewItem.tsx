import Link from "next/link";
import { scoreClass } from "./ScoreCircle";
import PhotoLightbox from "./PhotoLightbox";
import OwnReviewControls from "./OwnReviewControls";
import ShareButton from "./ShareButton";
import ReactionStrip from "./ReactionStrip";

type Review = {
  id: string;
  score: string;
  note: string | null;
  tags: string[] | null;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
  createdAt: Date | string;
  userId: string;
  userName: string | null;
  avatarSwatch: string | null;
  avatarUrl?: string | null;
  reactionCounts?: Record<string, number>;
  myReactions?: string[];
};

export default function ReviewItem({
  review,
  spotId,
  currentUserId,
}: {
  review: Review;
  /** Optional — when provided, lets the user edit/delete their own row inline. */
  spotId?: string;
  currentUserId?: string | null;
}) {
  const score = parseFloat(review.score);
  const isOwn = currentUserId != null && currentUserId === review.userId;
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
        <Link
          href={isOwn ? "/me" : `/u/${review.userId}`}
          className="flex items-center gap-2 min-w-0 group"
        >
          <div
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden"
            style={{
              background: review.avatarUrl ? "transparent" : gradient,
              backgroundImage: review.avatarUrl
                ? `url(${review.avatarUrl})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!review.avatarUrl && initials}
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold flex items-center gap-1.5">
              <span className="truncate group-hover:underline underline-offset-2 decoration-dotted">
                {review.userName ?? "A Baltimore local"}
              </span>
              {isOwn && <span className="chip chip-soft">You</span>}
            </div>
            <div className="font-mono text-[10px] text-[var(--ink-3)]">{dateStr}</div>
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ShareButton
            url={`/r/${review.id}`}
            title={`${review.userName ?? "A Baltimore local"}'s take`}
            text={review.note ?? undefined}
            ariaLabel="Share this review"
          />
          {isOwn && spotId && (
            <OwnReviewControls spotId={spotId} />
          )}
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
      </div>
      {review.note && (
        <div className="text-[13px] text-[var(--ink-2)] leading-[1.4]">{review.note}</div>
      )}
      {currentUserId != null && (
        <ReactionStrip
          ratingId={review.id}
          initialCounts={review.reactionCounts ?? {}}
          initialMine={review.myReactions ?? []}
        />
      )}
      {(() => {
        // Prefer the new array column. Fall back to the legacy single-photo
        // column for older reviews that haven't been migrated.
        const photos =
          review.photoUrls && review.photoUrls.length > 0
            ? review.photoUrls
            : review.photoUrl
              ? [review.photoUrl]
              : [];
        if (photos.length === 0) return null;
        if (photos.length === 1) {
          return (
            <PhotoLightbox
              src={photos[0]}
              alt={`Photo from ${review.userName ?? "a reviewer"}`}
              className="mt-2 rounded-xl h-36 w-full block border-0 p-0"
            />
          );
        }
        return (
          <div className="mt-2 flex gap-1.5 overflow-x-auto -mx-1 px-1 snap-x">
            {photos.map((url, i) => (
              <PhotoLightbox
                key={url + i}
                src={url}
                alt={`Photo ${i + 1} from ${review.userName ?? "a reviewer"}`}
                className="rounded-xl h-32 flex-shrink-0 block border-0 p-0 snap-start"
                style={{ width: 144 }}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
