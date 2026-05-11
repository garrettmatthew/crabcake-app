/**
 * Daily email digest — for each opted-in user, summarize notifications
 * since their last digest and send one email. Pure server-side, called
 * by the cron route.
 */
import { db } from "./db";
import { users, notifications, spots } from "./db/schema";
import { alias } from "drizzle-orm/pg-core";
import { and, eq, gt, desc } from "drizzle-orm";
import { sendEmail } from "./email";

// Aliased users table for joining the actor (so it doesn't collide with
// the recipient join in sendDailyDigests).
const actor = alias(users, "actor_user");

const BADGE_EMOJI: Record<string, string> = {
  "first-cake": "🥇",
  "five-spots": "🍽️",
  "ten-spots": "📒",
  "twenty-five-spots": "🏆",
  "three-cities": "🏙️",
  "five-states": "🗺️",
  "country-club": "⛳️",
  oyster: "🦪",
  hotel: "🏨",
  "perfect-ten": "💯",
  "harsh-critic": "💀",
  "boys-five": "🦀",
};

type SummaryItem = {
  followers: number;
  reviewsFromFollowed: Array<{ actor: string; spot: string; spotId: string }>;
  badges: string[];
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crabcakes.app";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Exported so the admin preview route can render the same HTML. */
export function renderDigestHtml(name: string, summary: SummaryItem): string {
  return buildHtml(name, summary);
}
export type DigestSummary = SummaryItem;

function buildHtml(name: string, summary: SummaryItem): string {
  const items: string[] = [];

  if (summary.followers > 0) {
    items.push(
      `<li style="margin-bottom: 10px;">
        <b>${summary.followers}</b> new ${
          summary.followers === 1 ? "follower" : "followers"
        }
      </li>`
    );
  }

  if (summary.reviewsFromFollowed.length > 0) {
    const lines = summary.reviewsFromFollowed
      .slice(0, 8)
      .map(
        (r) =>
          `<a href="${APP_URL}/spot/${r.spotId}" style="color: #e83d35; text-decoration: none; font-weight: 600;">${escapeHtml(r.actor)}</a> reviewed ${escapeHtml(r.spot)}`
      )
      .join("<br>");
    items.push(
      `<li style="margin-bottom: 10px;">
        <b>${summary.reviewsFromFollowed.length}</b> new
        ${summary.reviewsFromFollowed.length === 1 ? "review" : "reviews"}
        from people you follow:<br>
        <span style="color: #5a4f43; font-size: 14px; line-height: 1.5;">${lines}</span>
      </li>`
    );
  }

  if (summary.badges.length > 0) {
    const badges = summary.badges
      .map(
        (b) =>
          `<span style="display:inline-block; margin-right:6px; padding:4px 10px; border-radius:9999px; background:linear-gradient(135deg,#e4b248,#e83d35); color:#fff; font-weight:700; font-size:13px;">${escapeHtml(b)}</span>`
      )
      .join("");
    items.push(
      `<li style="margin-bottom: 10px;">
        You earned ${summary.badges.length === 1 ? "a new badge" : "new badges"}:<br>
        <div style="margin-top: 6px;">${badges}</div>
      </li>`
    );
  }

  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f2ea; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
    <div style="background: #e83d35; padding: 24px; color: #fff; display: flex; align-items: center; gap: 12px;">
      <div style="width: 44px; height: 44px; background: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 26px;">🦀</div>
      <div>
        <div style="font-size: 13px; opacity: 0.85; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700;">Daily digest</div>
        <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">Crabcakes</div>
      </div>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; color: #1a1612; margin-top: 0;">Hey ${escapeHtml(name)},</p>
      <p style="font-size: 15px; color: #5a4f43; line-height: 1.5;">
        Here's what happened on Crabcakes since you last checked in:
      </p>
      <ul style="font-size: 15px; color: #1a1612; line-height: 1.5; padding-left: 20px;">
        ${items.join("\n")}
      </ul>
      <div style="text-align: center; margin-top: 28px;">
        <a href="${APP_URL}/notifications" style="display: inline-block; background: #e83d35; color: #fff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: 800; font-size: 15px;">Open Crabcakes →</a>
      </div>
      <p style="font-size: 12px; color: #8a7d6e; margin-top: 28px; text-align: center;">
        You're getting this because you turned on the daily digest.
        <a href="${APP_URL}/me/edit" style="color: #8a7d6e;">Update preferences</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildText(name: string, summary: SummaryItem) {
  const lines: string[] = [`Hey ${name},`, "", "Daily Crabcakes digest:", ""];
  if (summary.followers > 0)
    lines.push(`• ${summary.followers} new follower${summary.followers === 1 ? "" : "s"}`);
  if (summary.reviewsFromFollowed.length > 0) {
    lines.push(
      `• ${summary.reviewsFromFollowed.length} new review${summary.reviewsFromFollowed.length === 1 ? "" : "s"} from people you follow:`
    );
    for (const r of summary.reviewsFromFollowed.slice(0, 8)) {
      lines.push(`  - ${r.actor} reviewed ${r.spot}`);
    }
  }
  if (summary.badges.length > 0) {
    lines.push(
      `• You earned ${summary.badges.length === 1 ? "a new badge" : `${summary.badges.length} new badges`}: ${summary.badges.join(", ")}`
    );
  }
  lines.push("", `Open Crabcakes: ${APP_URL}/notifications`);
  return lines.join("\n");
}

/**
 * Walk every user with the daily digest enabled, build their summary,
 * and send the email. Returns counts so the cron can log.
 */
export async function sendDailyDigests(opts?: { now?: Date }) {
  const now = opts?.now ?? new Date();

  const candidates = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      lastSentAt: users.emailDigestLastSentAt,
    })
    .from(users)
    .where(
      and(
        eq(users.emailDigestEnabled, true),
        sql`${users.email} IS NOT NULL`
      )
    );

  let sentCount = 0;
  let skippedCount = 0;

  for (const u of candidates) {
    if (!u.email) {
      skippedCount++;
      continue;
    }

    // Cutoff = last digest send OR 24 hours ago, whichever is more recent
    // (so people who just turned it on don't get a backlog).
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cutoff =
      u.lastSentAt && u.lastSentAt > dayAgo ? u.lastSentAt : dayAgo;

    // Pull notifications since cutoff. Actor + spot via LEFT JOIN — we
    // dropped correlated subqueries from the codebase after a string of
    // bugs where they silently returned wrong data.
    const rows = await db
      .select({
        kind: notifications.kind,
        meta: notifications.meta,
        actorName: actor.displayName,
        spotName: spots.name,
        spotId: notifications.spotId,
      })
      .from(notifications)
      .leftJoin(actor, eq(actor.id, notifications.actorId))
      .leftJoin(spots, eq(spots.id, notifications.spotId))
      .where(
        and(eq(notifications.userId, u.id), gt(notifications.createdAt, cutoff))
      )
      .orderBy(desc(notifications.createdAt));

    if (rows.length === 0) {
      skippedCount++;
      continue;
    }

    const summary: SummaryItem = {
      followers: 0,
      reviewsFromFollowed: [],
      badges: [],
    };
    for (const r of rows) {
      if (r.kind === "new_follower") summary.followers++;
      else if (r.kind === "followed_user_review" && r.spotName && r.spotId) {
        summary.reviewsFromFollowed.push({
          actor: r.actorName ?? "Someone",
          spot: r.spotName,
          spotId: r.spotId,
        });
      } else if (r.kind === "badge_earned" && r.meta) {
        // meta is like "First Cake 🥇" — strip the emoji for the email-text
        // version, keep it for HTML.
        summary.badges.push(r.meta);
        // Tag with the emoji map if there's a known badge ID.
        void BADGE_EMOJI;
      }
    }

    // Skip if nothing meaningful (e.g. only reaction notifications which we
    // intentionally don't email).
    if (
      summary.followers === 0 &&
      summary.reviewsFromFollowed.length === 0 &&
      summary.badges.length === 0
    ) {
      skippedCount++;
      continue;
    }

    const name = u.displayName ?? "there";
    const html = buildHtml(name, summary);
    const text = buildText(name, summary);
    const subject = "Your Crabcakes digest 🦀";

    const res = await sendEmail({
      to: u.email,
      subject,
      html,
      text,
    });
    if (res.ok || res.skipped) {
      await db
        .update(users)
        .set({ emailDigestLastSentAt: now })
        .where(eq(users.id, u.id));
    }
    if (res.ok) sentCount++;
    else skippedCount++;
  }

  return { sent: sentCount, skipped: skippedCount, candidates: candidates.length };
}
