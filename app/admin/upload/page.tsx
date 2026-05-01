"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  Loader2,
  MapPin,
  Upload as UploadIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { extractExif, type PhotoExif } from "@/lib/exif";
import { uploadPanorama, type UploadProgress } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Difficulty = "easy" | "medium" | "hard" | "extreme";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Łatwy",
  medium: "Średni",
  hard: "Trudny",
  extreme: "Ekstremalny",
};

const DIFFICULTY_ACTIVE: Record<Difficulty, string> = {
  easy: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  hard: "bg-red-100 text-red-700 border-red-200",
  extreme: "bg-purple-100 text-purple-700 border-purple-200",
};

type ItemStatus = "idle" | "uploading" | "done" | "error";

interface QueueItem {
  uid: string;
  file: File;
  previewUrl: string;
  exif: PhotoExif | null;
  title: string;
  lat: string;
  lng: string;
  difficulty: Difficulty;
  defaultYaw: number;
  status: ItemStatus;
  progress: UploadProgress | null;
  error: string | null;
}

export default function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addFiles = useCallback(async (files: File[]) => {
    const jpegs = files.filter((f) => f.type === "image/jpeg");
    if (jpegs.length === 0) {
      toast.error("Wymagane pliki JPEG (equirectangular 360°)");
      return;
    }
    if (jpegs.length < files.length) {
      toast.warning(`Pominięto ${files.length - jpegs.length} plik(ów) — wymagany format JPEG`);
    }

    const newItems: QueueItem[] = jpegs.map((file) => ({
      uid: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      exif: null,
      title: file.name.replace(/\.jpe?g$/i, "").replace(/[_-]/g, " "),
      lat: "",
      lng: "",
      difficulty: "medium" as Difficulty,
      defaultYaw: -90,
      status: "idle" as ItemStatus,
      progress: null,
      error: null,
    }));

    setQueue((prev) => [...prev, ...newItems]);

    await Promise.all(
      newItems.map(async (item) => {
        try {
          const exif = await extractExif(item.file);
          setQueue((prev) =>
            prev.map((qi) =>
              qi.uid === item.uid
                ? {
                    ...qi,
                    exif,
                    lat: exif.lat !== null ? String(exif.lat) : qi.lat,
                    lng: exif.lng !== null ? String(exif.lng) : qi.lng,
                  }
                : qi,
            ),
          );
        } catch {
          setQueue((prev) =>
            prev.map((qi) =>
              qi.uid === item.uid
                ? {
                    ...qi,
                    exif: {
                      lat: null,
                      lng: null,
                      altitude: null,
                      capturedAt: null,
                      heading: null,
                      width: null,
                      height: null,
                    },
                  }
                : qi,
            ),
          );
        }
      }),
    );
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function removeItem(uid: string) {
    setQueue((prev) => {
      const item = prev.find((i) => i.uid === uid);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.uid !== uid);
    });
  }

  function updateItem(uid: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));
  }

  async function uploadAll() {
    const idle = queue.filter((i) => i.status === "idle");
    if (idle.length === 0) return;

    const invalid = idle.filter((item) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lng);
      return isNaN(lat) || isNaN(lng);
    });
    if (invalid.length > 0) {
      invalid.forEach((item) => updateItem(item.uid, { error: "Brak lub niepoprawne współrzędne" }));
      toast.error("Uzupełnij współrzędne GPS dla wszystkich zdjęć");
      return;
    }

    setUploading(true);
    let errorCount = 0;

    for (const item of idle) {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lng);

      updateItem(item.uid, { status: "uploading", error: null, progress: null });

      try {
        await uploadPanorama(
          item.file,
          {
            id: crypto.randomUUID(),
            title: item.title.trim() || null,
            description: null,
            lat,
            lng,
            heading: item.exif?.heading ?? 0,
            defaultYaw: item.defaultYaw,
            altitude: item.exif?.altitude ?? null,
            capturedAt: item.exif?.capturedAt
              ? new Date(item.exif.capturedAt).toISOString()
              : null,
            difficulty: item.difficulty,
          },
          (progress) => updateItem(item.uid, { progress }),
        );
        updateItem(item.uid, {
          status: "done",
          progress: { stage: "done", generated: 0, total: 0, uploaded: 0 },
        });
        toast.success(`Dodano: „${item.title.trim() || item.file.name}"`);
      } catch (e) {
        errorCount++;
        updateItem(item.uid, {
          status: "error",
          error: e instanceof Error ? e.message : "Nieznany błąd uploadu",
        });
        toast.error(`Błąd: „${item.title.trim() || item.file.name}"`);
      }
    }

    setUploading(false);
    if (errorCount === 0) {
      router.push("/admin/photos");
    }
  }

  const idleCount = queue.filter((i) => i.status === "idle").length;
  const doneCount = queue.filter((i) => i.status === "done").length;
  const errorCount = queue.filter((i) => i.status === "error").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload panoram</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wgraj jedno lub wiele zdjęć equirectangular 360°. Kafelki generowane są w przeglądarce.
          </p>
        </div>
        {queue.length > 0 && (
          <Button onClick={uploadAll} disabled={uploading || idleCount === 0} variant="brand">
            {uploading ? (
              <>
                <Loader2 className="animate-spin" />
                Przetwarzanie…
              </>
            ) : (
              <>
                <UploadIcon />
                {idleCount > 1 ? `Wyślij wszystkie (${idleCount})` : "Wyślij"}
              </>
            )}
          </Button>
        )}
      </header>

      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        className={cn(
          "block border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200",
          queue.length === 0 ? "p-12 text-center" : "p-4",
          dragActive
            ? "border-brand bg-brand/5 scale-[1.005]"
            : "border-border bg-card/40 hover:border-foreground/30 hover:bg-card/60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
        {queue.length === 0 ? (
          <>
            <div
              className={cn(
                "size-14 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-colors",
                dragActive ? "bg-brand/15" : "bg-secondary",
              )}
            >
              <Camera
                className={cn("size-7", dragActive ? "text-brand" : "text-muted-foreground")}
                strokeWidth={1.6}
              />
            </div>
            <div className="font-medium mb-1">Przeciągnij pliki JPG 360° lub kliknij</div>
            <div className="text-sm text-muted-foreground">
              Equirectangular, 2:1 aspect ratio · Możesz wybrać wiele plików naraz
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <div
              className={cn(
                "size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                dragActive ? "bg-brand/15" : "bg-secondary",
              )}
            >
              <Plus
                className={cn("size-4", dragActive ? "text-brand" : "text-muted-foreground")}
              />
            </div>
            <span className="text-muted-foreground">Dodaj kolejne pliki JPG 360°</span>
          </div>
        )}
      </label>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {queue.length}{" "}
              {queue.length === 1 ? "zdjęcie" : queue.length < 5 ? "zdjęcia" : "zdjęć"} w
              kolejce
            </span>
            {(doneCount > 0 || errorCount > 0) && (
              <span className="flex items-center gap-3">
                {doneCount > 0 && (
                  <span className="text-success flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    {doneCount} gotowe
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="size-3.5" />
                    {errorCount} błąd
                  </span>
                )}
              </span>
            )}
          </div>

          {queue.map((item) => (
            <QueueItemCard
              key={item.uid}
              item={item}
              uploading={uploading}
              onRemove={() => removeItem(item.uid)}
              onUpdate={(patch) => updateItem(item.uid, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface QueueItemCardProps {
  item: QueueItem;
  uploading: boolean;
  onRemove: () => void;
  onUpdate: (patch: Partial<QueueItem>) => void;
}

function QueueItemCard({ item, uploading, onRemove, onUpdate }: QueueItemCardProps) {
  const isActive = item.status === "uploading";
  const isDone = item.status === "done";
  const isError = item.status === "error";
  const isIdle = item.status === "idle";

  const progress = item.progress;
  let pct = 0;
  if (isDone) {
    pct = 100;
  } else if (isActive && progress) {
    if (progress.stage === "init") pct = 2;
    else if (progress.stage === "generate" && progress.total > 0)
      pct = Math.round((progress.generated / progress.total) * 50);
    else if (progress.stage === "upload" && progress.total > 0)
      pct = 50 + Math.round((progress.uploaded / progress.total) * 44);
    else if (progress.stage === "save") pct = 96;
    else if (progress.stage === "done") pct = 100;
  }

  const stageText =
    isActive && progress
      ? {
          init: "Inicjalizacja…",
          generate: `Generowanie kafelków ${progress.generated}/${progress.total}`,
          upload: `Wysyłanie kafelków ${progress.uploaded}/${progress.total}`,
          save: "Zapisywanie…",
          done: "Gotowe!",
        }[progress.stage]
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-opacity",
        isDone && "opacity-60",
        isError && "border-destructive/40",
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-24 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.previewUrl}
            alt={item.title || item.file.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Fields */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <Input
              value={item.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Tytuł (opcjonalnie)"
              className="h-7 text-sm"
              disabled={!isIdle}
            />
            {isActive && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
            {isDone && <CheckCircle2 className="size-4 shrink-0 text-success" />}
            {isError && <AlertCircle className="size-4 shrink-0 text-destructive" />}
            <button
              onClick={onRemove}
              disabled={isActive || (uploading && isIdle)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
              aria-label="Usuń z kolejki"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Coords row */}
          {isIdle && (
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="size-3 text-muted-foreground shrink-0" />
              <Input
                value={item.lat}
                onChange={(e) => onUpdate({ lat: e.target.value, error: null })}
                placeholder="Szer. (lat)"
                className={cn(
                  "h-7 text-xs font-mono w-28",
                  item.error && !item.lat && "border-destructive",
                )}
                inputMode="decimal"
              />
              <Input
                value={item.lng}
                onChange={(e) => onUpdate({ lng: e.target.value, error: null })}
                placeholder="Dług. (lng)"
                className={cn(
                  "h-7 text-xs font-mono w-28",
                  item.error && !item.lng && "border-destructive",
                )}
                inputMode="decimal"
              />
              {item.exif?.lat && item.exif?.lng && (
                <span className="text-xs text-success flex items-center gap-1">
                  <Check className="size-3" />
                  GPS
                </span>
              )}
            </div>
          )}

          {/* Difficulty row */}
          {isIdle && (
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onUpdate({ difficulty: d })}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium border transition-all",
                    item.difficulty === d
                      ? DIFFICULTY_ACTIVE[d]
                      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  )}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          )}

          {/* Default yaw row */}
          {isIdle && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Widok domyślny (°)</span>
              <Input
                type="number"
                step="1"
                min={-180}
                max={180}
                value={item.defaultYaw}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  onUpdate({ defaultYaw: isNaN(v) ? -90 : Math.max(-180, Math.min(180, v)) });
                }}
                className="h-7 text-xs font-mono w-20"
                inputMode="numeric"
              />
              {item.defaultYaw !== -90 && (
                <button
                  onClick={() => onUpdate({ defaultYaw: -90 })}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Status / error text */}
          {isActive && stageText && (
            <p className="text-xs text-muted-foreground">{stageText}</p>
          )}
          {isDone && (
            <p className="text-xs text-success">Przesłano pomyślnie</p>
          )}
          {isError && item.error && (
            <p className="text-xs text-destructive">{item.error}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(isActive || isDone) && (
        <div className="h-1 bg-secondary">
          <div
            className={cn(
              "h-full transition-[width] duration-300",
              isDone ? "bg-success" : "bg-brand",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
