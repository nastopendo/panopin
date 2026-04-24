"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { extractExif, type PhotoExif } from "@/lib/exif";
import { uploadPanorama, type UploadProgress } from "@/lib/upload";

const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), {
  ssr: false,
});

type Difficulty = "easy" | "medium" | "hard";

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
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-2xl font-bold mb-6">Upload panoramy</h1>

        <label className="block border-2 border-dashed border-zinc-300 rounded-2xl p-12 text-center bg-white hover:border-zinc-400 cursor-pointer transition-colors">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg"
            onChange={handleSelect}
            className="hidden"
          />
          <div className="text-5xl mb-3">📸</div>
          <div className="font-medium mb-1">Przeciągnij JPG 360° lub kliknij</div>
          <div className="text-sm text-zinc-500">
            Equirectangular, 2:1 aspect ratio (np. 8192×4096 px)
          </div>
          {error && <div className="mt-4 text-red-500 text-sm">{error}</div>}
        </label>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Upload panoramy</h1>
        <button
          onClick={reset}
          disabled={loading}
          className="text-sm text-zinc-500 hover:text-zinc-900 disabled:opacity-50"
        >
          Zmień plik
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div>
          <div className="text-sm font-medium text-zinc-700 mb-2">Podgląd</div>
          <div className="bg-zinc-900 rounded-xl overflow-hidden h-[400px]">
            {previewUrl && <PanoramaViewer equirectUrl={previewUrl} className="w-full h-full" />}
          </div>
          {exif && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <InfoRow label="GPS" value={exif.lat && exif.lng ? `${exif.lat.toFixed(5)}, ${exif.lng.toFixed(5)}` : "brak"} ok={!!(exif.lat && exif.lng)} />
              <InfoRow label="Data" value={exif.capturedAt ? new Date(exif.capturedAt).toLocaleString("pl") : "brak"} ok={!!exif.capturedAt} />
              <InfoRow label="Heading" value={exif.heading !== null ? `${exif.heading.toFixed(1)}°` : "brak"} ok={exif.heading !== null} />
              <InfoRow label="Rozmiar" value={exif.width && exif.height ? `${exif.width}×${exif.height}` : "?"} ok />
            </div>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Field label="Tytuł (opcjonalnie)">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Rynek w Sanoku"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Opis (opcjonalnie)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Szerokość (lat)">
              <input
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="52.229676"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Długość (lng)">
              <input
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="21.012229"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </Field>
          </div>

          <Field label="Poziom trudności">
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    difficulty === d
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {d === "easy" ? "Łatwy" : d === "medium" ? "Średni" : "Trudny"}
                </button>
              ))}
            </div>
          </Field>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          {progress && <ProgressPanel progress={progress} />}

          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-xl py-3 font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Przetwarzanie…" : "Generuj kafelki i wyślij"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 block mb-1">{label}</span>
      {children}
    </label>
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
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-700">{stageText}</span>
        <span className="text-zinc-500 font-mono">{pct}%</span>
      </div>
      <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-900 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className={ok ? "text-zinc-900 font-medium" : "text-zinc-400"}>{value}</span>
    </div>
  );
}
