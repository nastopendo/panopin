"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), { ssr: false });
const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), { ssr: false });

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface StoredManifest {
  levels: Array<{ faceSize: number; nbTiles: number }>;
}

interface Photo {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  tileBaseUrl: string | null;
  tileManifest: StoredManifest | null;
  heading: number;
  lat: number;
  lng: number;
  difficulty: "easy" | "medium" | "hard";
  createdAt: string;
  tagIds: string[];
}

type Difficulty = Photo["difficulty"];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Łatwe",
  medium: "Średnie",
  hard: "Trudne",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-green-600 bg-green-50 border-green-200",
  medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
  hard: "text-red-600 bg-red-50 border-red-200",
};

interface EditDraft {
  title: string;
  lat: string;
  lng: string;
  difficulty: Difficulty;
  tagIds: string[];
}

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ title: "", lat: "", lng: "", difficulty: "medium", tagIds: [] });
  const [latError, setLatError] = useState("");
  const [lngError, setLngError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Preview dialog
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Delete dialog
  const [pendingDelete, setPendingDelete] = useState<Photo | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/photos").then((r) => r.json()),
      fetch("/api/admin/tags").then((r) => r.json()),
    ]).then(([photosData, tagsData]: [Photo[], Tag[]]) => {
      setPhotos(photosData);
      setTags(tagsData);
      setLoading(false);

      const editId = new URLSearchParams(window.location.search).get("edit");
      if (editId) {
        const target = photosData.find((p) => p.id === editId);
        if (target) openEdit(target);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(photo: Photo) {
    setDraft({
      title: photo.title ?? "",
      lat: photo.lat.toString(),
      lng: photo.lng.toString(),
      difficulty: photo.difficulty,
      tagIds: [...photo.tagIds],
    });
    setLatError("");
    setLngError("");
    setEditPhoto(photo);
  }

  function toggleDraftTag(tagId: string) {
    setDraft((d) => ({
      ...d,
      tagIds: d.tagIds.includes(tagId)
        ? d.tagIds.filter((t) => t !== tagId)
        : [...d.tagIds, tagId],
    }));
  }

  function validateCoords(): boolean {
    let ok = true;
    const lat = parseFloat(draft.lat);
    const lng = parseFloat(draft.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setLatError("Musi być liczbą od -90 do 90");
      ok = false;
    } else {
      setLatError("");
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setLngError("Musi być liczbą od -180 do 180");
      ok = false;
    } else {
      setLngError("");
    }
    return ok;
  }

  async function saveEdit() {
    if (!editPhoto || !validateCoords()) return;
    setEditSaving(true);
    const lat = parseFloat(draft.lat);
    const lng = parseFloat(draft.lng);
    const res = await fetch(`/api/admin/photos/${editPhoto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim() || null,
        lat,
        lng,
        difficulty: draft.difficulty,
        tagIds: draft.tagIds,
      }),
    });
    setEditSaving(false);
    if (!res.ok) {
      toast.error("Nie udało się zapisać zmian");
      return;
    }
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === editPhoto.id
          ? { ...p, title: draft.title.trim() || null, lat, lng, difficulty: draft.difficulty, tagIds: draft.tagIds }
          : p,
      ),
    );
    setEditPhoto(null);
    toast.success("Zdjęcie zaktualizowane");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id, title } = pendingDelete;
    setPendingDelete(null);
    const res = await fetch(`/api/admin/photos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Zdjęcie „${title ?? "bez tytułu"}" usunięte`);
    } else {
      toast.error("Nie udało się usunąć zdjęcia");
    }
  }

  function buildTilesManifest(photo: Photo) {
    if (!photo.tileBaseUrl || !photo.tileManifest?.levels) return undefined;
    return {
      photoId: photo.id,
      baseUrl: photo.tileBaseUrl,
      heading: photo.heading,
      levels: photo.tileManifest.levels,
    };
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Zdjęcia{" "}
            <span className="text-muted-foreground font-medium tabular-nums">
              ({photos.length})
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Zarządzaj panoramami w grze.
          </p>
        </div>
        <Button asChild variant="brand">
          <Link href="/admin/upload">
            <Plus />
            Dodaj zdjęcie
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Ładowanie…
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-2xl border bg-card/40 p-12 text-center">
          <ImageIcon className="size-10 mx-auto text-muted-foreground/40 mb-4" strokeWidth={1.4} />
          <p className="text-muted-foreground mb-4">Brak zdjęć w bazie.</p>
          <Button asChild variant="brand">
            <Link href="/admin/upload">
              <Plus />
              Dodaj pierwsze
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((p) => (
            <article key={p.id} className="rounded-xl border bg-card overflow-hidden flex flex-col">
              {/* Thumbnail — click for 360° preview */}
              <button
                onClick={() => setPreviewPhoto(p)}
                className="relative h-36 bg-secondary/50 group block w-full text-left"
                title="Podgląd 360°"
              >
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title ?? "panorama"}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-opacity group-hover:opacity-80"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="size-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-background/80 backdrop-blur rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1.5">
                    <Eye className="size-3.5" />
                    Podgląd 360°
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium border", DIFFICULTY_COLORS[p.difficulty])}>
                    {DIFFICULTY_LABELS[p.difficulty]}
                  </span>
                </div>
              </button>

              {/* Info */}
              <div className="p-3 flex flex-col flex-1 gap-2">
                <div>
                  <div className="font-medium text-sm truncate">
                    {p.title ?? <span className="text-muted-foreground italic">(bez tytułu)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  </div>
                </div>

                {/* Tags (read-only pills) */}
                {p.tagIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags
                      .filter((t) => p.tagIds.includes(t.id))
                      .map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={{ background: tag.color + "22", color: tag.color, borderColor: tag.color + "55" }}
                        >
                          {tag.name}
                        </span>
                      ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("pl-PL")}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => openEdit(p)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                      Edytuj
                    </Button>
                    <Button
                      onClick={() => setPendingDelete(p)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Edit dialog ── */}
      <Dialog open={editPhoto !== null} onOpenChange={(open) => !open && setEditPhoto(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edytuj zdjęcie</DialogTitle>
            <DialogDescription>
              Zaktualizuj tytuł, lokalizację, trudność i tagi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Tytuł</Label>
              <Input
                id="edit-title"
                placeholder="(bez tytułu)"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-lat">Szerokość (lat)</Label>
                <Input
                  id="edit-lat"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={draft.lat}
                  onChange={(e) => { setDraft((d) => ({ ...d, lat: e.target.value })); setLatError(""); }}
                  className={latError ? "border-destructive" : ""}
                />
                {latError && <p className="text-xs text-destructive">{latError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-lng">Długość (lng)</Label>
                <Input
                  id="edit-lng"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={draft.lng}
                  onChange={(e) => { setDraft((d) => ({ ...d, lng: e.target.value })); setLngError(""); }}
                  className={lngError ? "border-destructive" : ""}
                />
                {lngError && <p className="text-xs text-destructive">{lngError}</p>}
              </div>
            </div>

            {/* Location picker */}
            <div className="space-y-1.5">
              <Label>Lokalizacja na mapie</Label>
              <p className="text-xs text-muted-foreground">Kliknij na mapie lub przeciągnij marker.</p>
              <div className="rounded-lg overflow-hidden border h-48">
                <LocationPicker
                  key={editPhoto?.id}
                  lat={isNaN(parseFloat(draft.lat)) ? null : parseFloat(draft.lat)}
                  lng={isNaN(parseFloat(draft.lng)) ? null : parseFloat(draft.lng)}
                  onChange={(lat, lng) => {
                    setDraft((d) => ({ ...d, lat: lat.toString(), lng: lng.toString() }));
                    setLatError("");
                    setLngError("");
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <Label>Trudność</Label>
              <ToggleGroup
                type="single"
                value={draft.difficulty}
                onValueChange={(v) => v && setDraft((d) => ({ ...d, difficulty: v as Difficulty }))}
                className="w-full"
              >
                {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                  <ToggleGroupItem key={d} value={d} className="flex-1">
                    {DIFFICULTY_LABELS[d]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="space-y-1.5">
                <Label>Tagi</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = draft.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleDraftTag(tag.id)}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium border transition-opacity",
                          active ? "opacity-100" : "opacity-35 hover:opacity-60",
                        )}
                        style={{ background: tag.color + "33", color: tag.color, borderColor: tag.color + "66" }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPhoto(null)}>
              Anuluj
            </Button>
            <Button variant="brand" onClick={saveEdit} disabled={editSaving}>
              {editSaving ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 360° preview dialog ── */}
      <Dialog open={previewPhoto !== null} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Podgląd 360°</DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] min-h-[400px]">
            {previewPhoto && (
              <PanoramaViewer
                key={previewPhoto.id}
                tilesManifest={buildTilesManifest(previewPhoto)}
                className="w-full h-full"
              />
            )}
          </div>
          <div className="px-4 py-2 border-t bg-card/60 flex items-center justify-between text-sm">
            <span className="font-medium truncate">
              {previewPhoto?.title ?? <span className="text-muted-foreground italic">(bez tytułu)</span>}
            </span>
            <span className="text-muted-foreground font-mono text-xs shrink-0 ml-4">
              {previewPhoto?.lat.toFixed(5)}, {previewPhoto?.lng.toFixed(5)}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ── */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć zdjęcie?</DialogTitle>
            <DialogDescription>
              Tej operacji nie można cofnąć. Zdjęcie{" "}
              <strong>{pendingDelete?.title ?? "(bez tytułu)"}</strong> zostanie trwale usunięte z bazy.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 />
              Usuń zdjęcie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
