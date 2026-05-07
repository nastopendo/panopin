import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL!;

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_BASE_URL}/${key}`;
}

export async function presignPut(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, cmd, { expiresIn });
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

export const r2Keys = {
  original: (photoId: string) => `originals/${photoId}.jpg`,
  thumbnail: (photoId: string) => `thumbs/${photoId}.webp`,
  tile: (photoId: string, face: string, level: number, y: number, x: number) =>
    `tiles/${photoId}/${face}/${level}/${y}_${x}.jpg`,
  share: (roundId: string) => `shares/${roundId}.png`,
  media: (id: string, ext: string) => `media/${id}.${ext.replace(/^\./, "")}`,
};
