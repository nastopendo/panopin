import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { photos, photoTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";

const patchSchema = z.object({
  title: z.string().max(200).nullable().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { title, lat, lng, difficulty, tagIds } = parsed.data;

  const scalarPatch: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) scalarPatch.title = title;
  if (lat !== undefined) scalarPatch.lat = lat;
  if (lng !== undefined) scalarPatch.lng = lng;
  if (difficulty !== undefined) scalarPatch.difficulty = difficulty;

  if (Object.keys(scalarPatch).length > 1) {
    await db.update(photos).set(scalarPatch).where(eq(photos.id, id));
  }

  if (tagIds !== undefined) {
    await db.delete(photoTags).where(eq(photoTags.photoId, id));
    if (tagIds.length > 0) {
      await db.insert(photoTags).values(tagIds.map((tagId) => ({ photoId: id, tagId })));
    }
  }

  const [updated] = await db.select().from(photos).where(eq(photos.id, id));
  return NextResponse.json(updated ?? { ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  await db.delete(photos).where(eq(photos.id, id));
  return new NextResponse(null, { status: 204 });
}
