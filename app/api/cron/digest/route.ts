import { NextRequest, NextResponse } from "next/server";
import { sendDailyDigests } from "@/lib/digest";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily digest cron. Triggered by Vercel Cron (see vercel.json).
 * Verifies the cron secret so random callers can't trigger a mass
 * email blast.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendDailyDigests();
  return NextResponse.json(result);
}
