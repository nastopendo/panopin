"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Camera, Check, Loader2, MapPin, Upload as UploadIcon, X } from "lucide-react";
import { extractExif, type PhotoExif } from "@/lib/exif";
import { uploadPanorama, type UploadProgress } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), {
  ssr: false,
});

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Łatwy",
  medium: "Średni",
  hard: "Trudny",
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exif, setExif] = useState<PhotoExif | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [manualLat, setManualLat] = useState<string>("");
  const [manualLng, setManualLng] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(async (f: File) => {
    setError(null);
    setFile(f);

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    try {
      const parsed = await extractExif(f);
      setExif(parsed);
      if (parsed.lat !== null) setManualLat(String(parsed.lat));
      if (parsed.lng !== null) setManualLng(String(parsed.lng));
    } catch (e) {
      console.warn("EXIF parse failed", e);
      setExif({
        lat: null,
        lng: null,
        altitude: null,
        capturedAt: null,
        heading: null,
        width: null,
        height: null,
      });
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "image/jpeg") handleFile(f);
    else setError("Wymagany plik JPEG (equirectangular 360°)");
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setExif(null);
    setTitle("");
    setDescription("");
    setDifficulty("medium");
    setManualLat("");
    setManualLng("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    setLoading(true);
    setError(null);
    setProgress(null);

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (!file) {
      setError("Brak pliku");
      setLoading(false);
      return;
    }
    if (isNaN(lat) || isNaN(lng)) {
      setError("Brak lub niepoprawne współrzędne");
      setLoading(false);
      return;
    }

    try {
      await uploadPanorama(
        file,
        {
          id: crypto.randomUUID(),
          title: title.trim() || null,
          description: description.trim() || null,
          lat,
          lng,
          heading: exif?.heading ?? 0,
          altitude: exif?.altitude ?? null,
          capturedAt: exif?.capturedAt ? new Date(exif.capturedAt).toISOString() : null,
          difficulty,
        },
        setProgress,
      );
      router.push("/admin/photos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nieznany błąd uploadu");
      setLoading(false);
    }
  }

  if (!file) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Upload panoramy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wgraj zdjęcie equirectangular 360°. Kafelki zostaną wygenerowane w Twojej przeglądarce — to może chwilę zająć.
          </p>
        </header>

        <label
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          className={cn(
            "block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200",
            dragActive
              ? "border-brand bg-brand/5 scale-[1.005]"
              : "border-border bg-card/40 hover:border-foreground/30 hover:bg-card/60",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg"
            onChange={handleSelect}
            className="hidden"
          />
          <div
            className={cn(
              "size-14 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-colors",
              dragActive ? "bg-brand/15" : "bg-secondary",
            )}
          >
            <Camera className={cn("size-7", dragActive ? "text-brand" : "text-muted-foreground")} strokeWidth={1.6} />
          </div>
          <div className="font-medium mb-1">Przeciągnij plik JPG 360° lub kliknij</div>
          <div className="text-sm text-muted-foreground">
            Equirectangular, 2:1 aspect ratio (np. 8192×4096 px)
          </div>
          {error && (
            <div role="alert" className="mt-4 text-destructive text-sm">
              {error}
            </div>
          )}
        </label>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Upload panoramy</h1>
          <p className="text-sm text-muted-foreground truncate">{file.name}</p>
        </div>
        <Button onClick={reset} disabled={loading} variant="ghost" size="sm">
          <X />
          Zmień plik
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Podgląd
          </Label>
          <div className="bg-card rounded-xl overflow-hidden h-[400px] border">
            {previewUrl && (
              <PanoramaViewer equirectUrl={previewUrl} className="w-full h-full" />
            )}
          </div>
          {exif && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoRow
                label="GPS"
                value={
                  exif.lat && exif.lng
                    ? `${exif.lat.toFixed(5)}, ${exif.lng.toFixed(5)}`
                    : "brak"
                }
                ok={!!(exif.lat && exif.lng)}
              />
              <InfoRow
                label="Data"
                value={
                  exif.capturedAt
                    ? new Date(exif.capturedAt).toLocaleString("pl")
                    : "brak"
                }
                ok={!!exif.capturedAt}
              />
              <InfoRow
                label="Heading"
                value={exif.heading !== null ? `${exif.heading.toFixed(1)}°` : "brak"}
                ok={exif.heading !== null}
              />
              <InfoRow
                label="Rozmiar"
                value={
                  exif.width && exif.height
                    ? `${exif.width}×${exif.height}`
                    : "?"
                }
                ok
              />
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadane</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Tytuł (opcjonalnie)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Rynek w Sanoku"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Opis (opcjonalnie)</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="flex w-full rounded-lg border border-input bg-card/30 px-3.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:bg-card/60 focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lat" className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  Szerokość
                </Label>
                <Input
                  id="lat"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="52.229676"
                  inputMode="decimal"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng" className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  Długość
                </Label>
                <Input
                  id="lng"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="21.012229"
                  inputMode="decimal"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Trudność</Label>
              <ToggleGroup
                type="single"
                value={difficulty}
                onValueChange={(v) => v && setDifficulty(v as Difficulty)}
                className="w-full"
              >
                {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                  <ToggleGroupItem
                    key={d}
                    value={d}
                    aria-label={DIFFICULTY_LABELS[d]}
                    className="flex-1"
                  >
                    {DIFFICULTY_LABELS[d]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {progress && <ProgressPanel progress={progress} />}

            <Button
              onClick={handleUpload}
              disabled={loading}
              variant="brand"
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Przetwarzanie…
                </>
              ) : (
                <>
                  <UploadIcon />
                  Generuj kafelki i wyślij
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProgressPanel({ progress }: { progress: UploadProgress }) {
  const { stage, generated, total, uploaded } = progress;
  const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;

  const stageText = {
    init: "Inicjalizacja…",
    generate: `Generowanie kafelków ${generated}/${total}`,
    upload: `Wysyłanie kafelków ${uploaded}/${total}`,
    save: "Zapisywanie rekordu…",
    done: "Gotowe!",
  }[stage];

  return (
    <div className="bg-secondary/50 border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{stageText}</span>
        <span className="text-muted-foreground tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-background rounded-full overflow-hidden">
        <div
          className="h-full bg-brand transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between bg-card/40 border rounded-lg px-3 py-2">
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
        {ok && <Check className="size-3 text-success" />}
        {label}
      </span>
      <span className={cn(ok ? "text-foreground font-medium" : "text-muted-foreground/60")}>
        {value}
      </span>
    </div>
  );
}
