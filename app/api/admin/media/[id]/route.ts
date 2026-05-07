import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db/client";
import { mediaAssets, announcement } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;

  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Delete from R2 (idempotent — ignore NoSuchKey)
  try {
    await r2.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: row.storageKey }),
    );
  } catch (err) {
    if (!(err instanceof Error) || !err.name.includes("NoSuchKey")) {
      throw err;
    }
  }

  // If announcement.image_url points to this asset, null it out
  await db
    .update(announcement)
    .set({ imageUrl: null, updatedAt: new Date() })
    .where(eq(announcement.imageUrl, row.url));

  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));

  return NextResponse.json({ ok: true });
}
