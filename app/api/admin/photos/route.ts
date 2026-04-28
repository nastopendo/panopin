import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { photos, photoTags } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const list = await db.select().from(photos).orderBy(desc(photos.createdAt));

  // Fetch tag assignments for all photos in one query
  const tagAssignments = await db.select().from(photoTags);
  const tagsByPhotoId = tagAssignments.reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.photoId]) acc[row.photoId] = [];
    acc[row.photoId].push(row.tagId);
    return acc;
  }, {});

  const result = list.map((p) => ({
    id: p.id,
    title: p.title,
    thumbnailUrl: p.thumbnailUrl,
    tileBaseUrl: p.tileBaseUrl,
    tileManifest: p.tileManifest,
    heading: p.heading,
    lat: p.lat,
    lng: p.lng,
    difficulty: p.difficulty,
    createdAt: p.createdAt,
    tagIds: tagsByPhotoId[p.id] ?? [],
  }));

  return NextResponse.json(result);
}
