import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { R2_PUBLIC_BASE_URL } from "@/lib/r2";
import { isSafeHttpUrl } from "@/lib/url";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const rows = await db
    .select()
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.uploadedAt));

  return NextResponse.json(rows);
}

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const FinalizeSchema = z.object({
  url: z.string().url().refine(isSafeHttpUrl, "URL musi być http(s)"),
  storageKey: z.string().min(1).max(500),
  filename: z.string().max(200).nullable(),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = FinalizeSchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json(
      { error: "invalid body", details: parse.error },
      { status: 400 },
    );
  }

  const data = parse.data;

  // Defense-in-depth: enforce that URL points to our R2 bucket and matches storageKey.
  // Without this an attacker with admin rights could insert arbitrary URLs into the
  // media library (e.g. trackers, malicious externally-hosted images).
  const expectedPrefix = `${R2_PUBLIC_BASE_URL}/`;
  if (!data.url.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { error: "url must point to our R2 bucket" },
      { status: 400 },
    );
  }
  const derivedKey = data.url.slice(expectedPrefix.length);
  if (derivedKey !== data.storageKey) {
    return NextResponse.json(
      { error: "url and storageKey do not match" },
      { status: 400 },
    );
  }
  if (!data.storageKey.startsWith("media/")) {
    return NextResponse.json(
      { error: "storageKey must be under media/" },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(mediaAssets)
    .values({
      url: data.url,
      storageKey: data.storageKey,
      filename: data.filename,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      uploadedBy: admin.id,
    })
    .returning();

  return NextResponse.json(row);
}
