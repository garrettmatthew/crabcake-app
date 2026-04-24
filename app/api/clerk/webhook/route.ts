import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

type ClerkEvent =
  | {
      type: "user.deleted";
      data: { id?: string };
    }
  | {
      type: "user.updated" | "user.created";
      data: {
        id: string;
        email_addresses?: Array<{ email_address: string }>;
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
      };
    };

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 501 });
  }

  const headers = Object.fromEntries(req.headers.entries());
  const body = await req.text();

  let evt: ClerkEvent;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(body, {
      "svix-id": headers["svix-id"]!,
      "svix-timestamp": headers["svix-timestamp"]!,
      "svix-signature": headers["svix-signature"]!,
    }) as ClerkEvent;
  } catch (e) {
    return NextResponse.json(
      { error: "invalid signature", detail: e instanceof Error ? e.message : "" },
      { status: 400 }
    );
  }

  try {
    if (evt.type === "user.deleted") {
      const clerkId = evt.data.id;
      if (clerkId) {
        // Cascades to ratings + bookmarks via FK
        await db.delete(users).where(eq(users.clerkId, clerkId));
      }
    } else if (evt.type === "user.updated" || evt.type === "user.created") {
      const d = evt.data;
      const email = d.email_addresses?.[0]?.email_address ?? null;
      const displayName =
        (d.first_name && d.last_name ? `${d.first_name} ${d.last_name}` : d.first_name) ??
        d.username ??
        null;
      const existing = await db.query.users.findFirst({
        where: eq(users.clerkId, d.id),
      });
      if (existing) {
        await db
          .update(users)
          .set({ email, displayName: displayName ?? existing.displayName })
          .where(eq(users.id, existing.id));
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: "db error", detail: e instanceof Error ? e.message : "" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
