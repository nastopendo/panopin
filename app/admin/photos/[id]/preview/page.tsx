import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { photos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import PanoramaPreview from "./PanoramaPreview";

export default async function PhotoPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const { id } = await params;
  const [photo] = await db.select().from(photos).where(eq(photos.id, id));
  if (!photo) redirect("/admin/photos");

  const manifest =
    photo.tileBaseUrl && photo.tileManifest
      ? {
          photoId: photo.id,
          baseUrl: photo.tileBaseUrl,
          heading: photo.heading,
          levels: (photo.tileManifest as { levels: Array<{ faceSize: number; nbTiles: number }> }).levels,
        }
      : null;

  return (
    <PanoramaPreview
      photoId={photo.id}
      title={photo.title}
      lat={photo.lat}
      lng={photo.lng}
      manifest={manifest}
    />
  );
}
