import Link from "next/link";
import { ensureDemoUser } from "@/lib/auth";
import { listMyBookmarks } from "@/lib/queries";
import ScoreCircle from "@/components/ScoreCircle";

export default async function SavedPage() {
  await ensureDemoUser();
  const bookmarks = await listMyBookmarks();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-3.5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-none">
            Saved.
          </h1>
          <div className="text-xs text-[var(--ink-3)] font-medium mt-0.5">
            {bookmarks.length} spot{bookmarks.length === 1 ? "" : "s"} on your want-to-try list.
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-3.5 pt-1">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 py-20">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mb-5 relative"
              style={{ background: "var(--bg-2)" }}
            >
              <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="var(--crab)" strokeWidth={2} strokeLinecap="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </div>
            <div className="font-display text-[22px] font-extrabold tracking-tight mb-1">
              No saved spots yet
            </div>
            <div className="text-[13.5px] text-[var(--ink-2)] leading-[1.5] max-w-72 mb-5">
              Tap the bookmark icon on any spot to save it for later. Your want-to-try list
              shows up here.
            </div>
            <Link
              href="/"
              className="h-11 px-5 bg-[var(--crab)] text-white rounded-full font-bold text-sm inline-flex items-center"
            >
              Browse the map
            </Link>
          </div>
        ) : (
          bookmarks.map((b) => {
            const boys = b.boysScore != null ? parseFloat(b.boysScore) : null;
            return (
              <Link
                key={b.id}
                href={`/spot/${b.spotId}`}
                className="grid gap-3 p-3 bg-[var(--panel)] border border-[var(--border)] rounded-2xl items-center mb-2"
                style={{ gridTemplateColumns: "56px 1fr auto" }}
              >
                <div
                  className="w-14 h-14 rounded-xl bg-cover bg-center"
                  style={{
                    backgroundImage: b.spotPhoto ? `url(${b.spotPhoto})` : undefined,
                    background: b.spotPhoto
                      ? undefined
                      : "linear-gradient(135deg, #e8c185, #6b4024)",
                  }}
                />
                <div>
                  <div className="font-display font-bold text-sm tracking-tight">
                    {b.spotName}
                  </div>
                  <div className="text-[11px] text-[var(--ink-3)] font-medium mt-0.5">
                    {b.spotCity}
                    {boys != null ? (
                      <>
                        {" · "}
                        <b style={{ color: "var(--crab)" }}>Boys {boys.toFixed(1)}</b>
                      </>
                    ) : null}
                  </div>
                </div>
                <ScoreCircle score={boys} size="sm" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
