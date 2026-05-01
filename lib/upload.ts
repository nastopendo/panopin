/**
 * Upload orchestration: tile-gen worker → presigned URLs → parallel PUT to R2.
 * Used in the admin upload page.
 */

type Face = "front" | "right" | "back" | "left" | "top" | "bottom";

export interface UploadMetadata {
  id: string;           // uuid (pre-generated client-side)
  title: string | null;
  description: string | null;
  lat: number;
  lng: number;
  heading: number;
  altitude: number | null;
  capturedAt: string | null; // ISO
  difficulty: "easy" | "medium" | "hard" | "extreme";
}

export interface UploadProgress {
  stage: "init" | "generate" | "upload" | "save" | "done";
  generated: number;   // tiles generated so far
  total: number;       // total tiles expected
  uploaded: number;    // tiles uploaded so far
}

const CONCURRENCY = 6;
const LEVELS = [
  { faceSize: 512, nbTiles: 1 },
  { faceSize: 1024, nbTiles: 2 },
  { faceSize: 2048, nbTiles: 4 },
];

interface PresignKey {
  kind: "thumbnail" | "tile";
  face?: Face;
  level?: number;
  y?: number;
  x?: number;
  contentType: "image/jpeg" | "image/webp";
}

interface PresignedUrl extends PresignKey {
  key: string;
  url: string;
}

async function presignAll(photoId: string, keys: PresignKey[]): Promise<PresignedUrl[]> {
  const res = await fetch("/api/photos/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoId, keys }),
  });
  if (!res.ok) throw new Error(`presign failed: ${res.status}`);
  const { urls } = await res.json();
  return urls;
}

async function putToR2(url: string, blob: Blob, contentType: string): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PUT failed ${res.status}: ${body.slice(0, 200)}`);
  }
}

/** Parallel queue runner — runs fn(item) with given concurrency limit. */
async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let idx = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

export async function uploadPanorama(
  file: File,
  meta: UploadMetadata,
  onProgress: (p: UploadProgress) => void,
): Promise<void> {
  onProgress({ stage: "init", generated: 0, total: 0, uploaded: 0 });

  // 1. Start worker
  const worker = new Worker(new URL("../workers/tile-gen.worker.ts", import.meta.url), {
    type: "module",
  });

  const arrayBuffer = await file.arrayBuffer();

  let total = 0;
  let generated = 0;
  let uploaded = 0;
  const pending: Array<Promise<void>> = [];
  const uploadQueue: Array<() => Promise<void>> = [];

  // Build presign keys for all tiles
  const tileKeys: PresignKey[] = [];
  for (const face of ["front", "right", "back", "left", "top", "bottom"] as Face[]) {
    for (let level = 0; level < LEVELS.length; level++) {
      const n = LEVELS[level].nbTiles;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          tileKeys.push({ kind: "tile", face, level, y, x, contentType: "image/jpeg" });
        }
      }
    }
  }

  const allKeys: PresignKey[] = [
    { kind: "thumbnail", contentType: "image/webp" },
    ...tileKeys,
  ];

  // 2. Request presigned URLs
  const urls = await presignAll(meta.id, allKeys);

  const urlFor = {
    thumbnail: urls.find((u) => u.kind === "thumbnail")!,
    tile: (face: Face, level: number, y: number, x: number) =>
      urls.find(
        (u) => u.kind === "tile" && u.face === face && u.level === level && u.y === y && u.x === x,
      )!,
  };

  // 3. Wire up worker messages → upload queue
  const workerPromise = new Promise<void>((resolve, reject) => {
    worker.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === "ready") {
        total = msg.totalTiles;
        onProgress({ stage: "generate", generated: 0, total, uploaded: 0 });

        pending.push(putToR2(urlFor.thumbnail.url, msg.thumbnail, "image/webp"));
      } else if (msg.type === "tile") {
        generated++;
        const { face, level, x, y, blob } = msg;
        const u = urlFor.tile(face, level, y, x);
        pending.push(
          putToR2(u.url, blob, "image/jpeg").then(() => {
            uploaded++;
            onProgress({ stage: "upload", generated, total, uploaded });
          }),
        );
        onProgress({ stage: "generate", generated, total, uploaded });
      } else if (msg.type === "done") {
        resolve();
      } else if (msg.type === "error") {
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (e) => reject(new Error(`Worker error: ${e.message}`));
  });

  // 4. Kick off tile generation
  worker.postMessage({ type: "start", arrayBuffer }, [arrayBuffer]);

  // 5. Wait for worker + all uploads
  await workerPromise;
  await Promise.all(pending);
  worker.terminate();

  // 6. Save record to DB
  onProgress({ stage: "save", generated, total, uploaded });

  const res = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...meta, tileLevels: LEVELS }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Save failed: ${body}`);
  }

  onProgress({ stage: "done", generated, total, uploaded });
}
