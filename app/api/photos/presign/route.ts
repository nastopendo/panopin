import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/server";
import { presignPut, r2Keys } from "@/lib/r2";

const BodySchema = z.object({
  photoId: z.string().uuid(),
  keys: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("thumbnail"), contentType: z.literal("image/webp") }),
        z.object({
          kind: z.literal("tile"),
          face: z.enum(["front", "right", "back", "left", "top", "bottom"]),
          level: z.number().int().min(0).max(2),
          y: z.number().int().min(0).max(3),
          x: z.number().int().min(0).max(3),
          contentType: z.literal("image/jpeg"),
        }),
      ]),
    )
    .min(1)
    .max(200), // 126 tiles + thumbnail
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body", details: parse.error }, { status: 400 });
  }

  const { photoId, keys } = parse.data;

  const urls = await Promise.all(
    keys.map(async (k) => {
      let key: string;
      if (k.kind === "thumbnail") key = r2Keys.thumbnail(photoId);
      else key = r2Keys.tile(photoId, k.face, k.level, k.y, k.x);

      const url = await presignPut(key, k.contentType, 3600);
      return { ...k, key, url };
    }),
  );

  return NextResponse.json({ urls });
}
