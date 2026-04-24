import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { photos } from "@/lib/db/schema";
import { R2_PUBLIC_BASE_URL, getPublicUrl, r2Keys } from "@/lib/r2";

const BodySchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().optional().default(0),
  altitude: z.number().nullable().optional(),
  capturedAt: z.string().datetime().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  tileLevels: z.array(
    z.object({
      faceSize: z.number().int(),
      nbTiles: z.number().int(),
    }),
  ),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body", details: parse.error }, { status: 400 });
  }

  const body = parse.data;

  const [inserted] = await db
    .insert(photos)
    .values({
      id: body.id,
      uploaderId: admin.id,
      title: body.title ?? null,
      description: body.description ?? null,
      lat: body.lat,
      lng: body.lng,
      heading: body.heading ?? 0,
      altitude: body.altitude ?? null,
      capturedAt: body.capturedAt ? new Date(body.capturedAt) : null,
      difficulty: body.difficulty,
      status: "published",
      tileBaseUrl: R2_PUBLIC_BASE_URL,
      tileManifest: { levels: body.tileLevels },
      thumbnailUrl: getPublicUrl(r2Keys.thumbnail(body.id)),
    })
    .returning();

  return NextResponse.json({ photo: inserted });
}
