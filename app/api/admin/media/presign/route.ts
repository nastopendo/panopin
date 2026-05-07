import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/server";
import { presignPut, r2Keys, getPublicUrl } from "@/lib/r2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_BY_TYPE: Record<(typeof ALLOWED_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const BodySchema = z.object({
  filename: z.string().max(200).optional(),
  contentType: z.enum(ALLOWED_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json(
      { error: "invalid body", details: parse.error },
      { status: 400 },
    );
  }

  const { contentType } = parse.data;
  const id = randomUUID();
  const ext = EXT_BY_TYPE[contentType];
  const storageKey = r2Keys.media(id, ext);
  const publicUrl = getPublicUrl(storageKey);
  const uploadUrl = await presignPut(storageKey, contentType, 3600);

  return NextResponse.json({ uploadUrl, publicUrl, storageKey });
}
