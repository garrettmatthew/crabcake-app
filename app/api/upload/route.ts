import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const file = req.body;
    const filename = req.nextUrl.searchParams.get("filename");
    if (!file || !filename) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    // Basic whitelist of image types from the filename extension
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    if (!["jpg", "jpeg", "png", "webp", "heic", "gif"].includes(ext)) {
      return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
    }
    const key = `reviews/${user.id}/${nanoid()}.${ext}`;
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upload failed" },
      { status: 500 }
    );
  }
}
