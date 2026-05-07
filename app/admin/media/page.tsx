"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  url: string;
  storageKey: string;
  filename: string | null;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "przed chwilą";
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h temu`;
  const days = Math.round(hours / 24);
  return `${days} d temu`;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/media");
      if (!res.ok) throw new Error("HTTP " + res.status);
      setAssets(await res.json());
    } catch {
      setError("Nie można wczytać biblioteki");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Dozwolone formaty: JPG, PNG, WebP");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Maksymalny rozmiar: 5 MB");
      return;
    }

    setUploading(true);
    try {
      const presign = await fetch("/api/admin/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      }).then((r) => r.json());

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to R2 failed");

      const finalize = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: presign.publicUrl,
          storageKey: presign.storageKey,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!finalize.ok) throw new Error("Finalize failed");

      toast.success("Wgrano");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd uploadu");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(asset: MediaAsset) {
    if (
      !confirm(
        `Czy na pewno usunąć „${asset.filename ?? asset.storageKey}"? Operacja jest nieodwracalna.`,
      )
    )
      return;

    setDeleting(asset.id);
    try {
      const res = await fetch(`/api/admin/media/${asset.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      toast.success("Usunięto");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd usuwania");
    } finally {
      setDeleting(null);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Skopiowano URL");
    } catch {
      toast.error("Nie udało się skopiować");
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteka mediów</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Wszystkie obrazy wgrane przez admina. Można ich używać w ogłoszeniach
          i innych miejscach aplikacji.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (uploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file) handleUpload(file);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer outline-none",
            "text-muted-foreground hover:bg-accent/40 transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring",
            dragActive && "border-brand bg-brand/10 text-foreground",
            uploading && "opacity-50 pointer-events-none",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">Wgrywanie…</span>
            </>
          ) : (
            <>
              <Upload className="size-6" />
              <span className="text-sm">
                {dragActive
                  ? "Upuść plik tutaj"
                  : "Kliknij lub przeciągnij plik"}
              </span>
              <span className="text-xs">JPG/PNG/WebP, max 5 MB</span>
            </>
          )}
        </div>
      </div>

      {assets === null ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="size-4 animate-spin" />
          Ładowanie…
        </div>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Brak wgranych obrazów.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <li
              key={asset.id}
              className="rounded-xl border bg-card/40 overflow-hidden flex flex-col"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.filename ?? ""}
                className="w-full aspect-[4/3] object-cover bg-muted"
                loading="lazy"
              />
              <div className="p-3 flex-1 flex flex-col gap-2 text-xs">
                <div className="font-medium truncate" title={asset.filename ?? ""}>
                  {asset.filename ?? "(bez nazwy)"}
                </div>
                <div className="text-muted-foreground">
                  {asset.contentType.split("/")[1].toUpperCase()} ·{" "}
                  {formatSize(asset.sizeBytes)} · {formatRelative(asset.uploadedAt)}
                </div>
                <div className="flex gap-1.5 mt-auto">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => copyUrl(asset.url)}
                  >
                    <Copy className="size-3" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(asset)}
                    disabled={deleting === asset.id}
                  >
                    {deleting === asset.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
