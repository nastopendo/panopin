"use client";

import { useRef, useState } from "react";
import { ImagePlus, Library, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  url: string;
  filename: string | null;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ImagePickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type Mode = "upload" | "library" | "url";

export function ImagePicker({ value, onChange }: ImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [library, setLibrary] = useState<MediaAsset[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openWith(initialMode: Mode) {
    setMode(initialMode);
    setUrlDraft(value ?? "");
    setOpen(true);
    if (initialMode === "library") loadLibrary();
  }

  async function loadLibrary() {
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      if (!res.ok) throw new Error("HTTP " + res.status);
      setLibrary(await res.json());
    } catch {
      toast.error("Nie udało się wczytać biblioteki");
    } finally {
      setLibraryLoading(false);
    }
  }

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
      const presignRes = await fetch("/api/admin/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!presignRes.ok) throw new Error("Presign failed");
      const presign: { uploadUrl: string; publicUrl: string; storageKey: string } =
        await presignRes.json();

      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to R2 failed");

      const finalizeRes = await fetch("/api/admin/media", {
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
      if (!finalizeRes.ok) throw new Error("Finalize failed");

      onChange(presign.publicUrl);
      setOpen(false);
      toast.success("Obraz wgrany");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd uploadu");
    } finally {
      setUploading(false);
    }
  }

  function handleApplyUrl() {
    if (!urlDraft.trim()) {
      onChange(null);
      setOpen(false);
      return;
    }
    try {
      new URL(urlDraft);
    } catch {
      toast.error("Niepoprawny URL");
      return;
    }
    onChange(urlDraft.trim());
    setOpen(false);
  }

  function handlePickFromLibrary(asset: MediaAsset) {
    onChange(asset.url);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="rounded-xl border bg-card/40 p-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Podgląd obrazu"
            className="w-full max-h-48 object-contain rounded-lg bg-muted"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openWith("upload")}
            >
              <ImagePlus className="size-4" />
              Zmień
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Usuń
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openWith("upload")}
          >
            <Upload className="size-4" />
            Wgraj nowy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openWith("library")}
          >
            <Library className="size-4" />
            Z biblioteki
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openWith("url")}
          >
            <Link2 className="size-4" />
            Z URL
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Wybierz obraz</DialogTitle>
            <DialogDescription>
              Wgraj nowy plik, wybierz z biblioteki lub podaj zewnętrzny URL.
            </DialogDescription>
          </DialogHeader>

          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as Mode)}
            className="w-full"
          >
            <ToggleGroupItem value="upload" className="flex-1">
              <Upload className="size-4 mr-1.5" />
              Wgraj
            </ToggleGroupItem>
            <ToggleGroupItem
              value="library"
              className="flex-1"
              onClick={loadLibrary}
            >
              <Library className="size-4 mr-1.5" />
              Biblioteka
            </ToggleGroupItem>
            <ToggleGroupItem value="url" className="flex-1">
              <Link2 className="size-4 mr-1.5" />
              URL
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="min-h-[200px] py-2">
            {mode === "upload" && (
              <div className="space-y-3">
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
                    "w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer outline-none",
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
            )}

            {mode === "library" && (
              <div>
                {libraryLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                    <Loader2 className="size-4 animate-spin" />
                    Ładowanie…
                  </div>
                ) : library && library.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                    {library.map((asset) => (
                      <button
                        type="button"
                        key={asset.id}
                        onClick={() => handlePickFromLibrary(asset)}
                        className="aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-brand transition"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.filename ?? ""}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Biblioteka pusta. Wgraj pierwszy obraz w zakładce „Wgraj".
                  </p>
                )}
              </div>
            )}

            {mode === "url" && (
              <div className="space-y-2">
                <Input
                  type="url"
                  placeholder="https://…"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Wklej URL obrazu z dowolnej strony. Pamiętaj, że zewnętrzny host
                  może w przyszłości zniknąć.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {mode === "url" && (
              <Button onClick={handleApplyUrl} variant="brand">
                Użyj URL
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
