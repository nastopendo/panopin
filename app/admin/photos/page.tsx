"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Photo {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  lat: number;
  lng: number;
  difficulty: "easy" | "medium" | "hard";
  createdAt: string;
  tagIds: string[];
}

const DIFFICULTY_LABELS: Record<Photo["difficulty"], string> = {
  easy: "Łatwe",
  medium: "Średnie",
  hard: "Trudne",
};

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Photo | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/photos").then((r) => r.json()),
      fetch("/api/admin/tags").then((r) => r.json()),
    ]).then(([photosData, tagsData]) => {
      setPhotos(photosData);
      setTags(tagsData);
    });
  }, []);

  async function patchPhoto(
    id: string,
    patch: { difficulty?: string; tagIds?: string[] },
  ) {
    setSaving(id);
    await fetch(`/api/admin/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(null);
  }

  function updateDifficulty(id: string, difficulty: Photo["difficulty"]) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, difficulty } : p)));
    patchPhoto(id, { difficulty });
  }

  function toggleTag(photoId: string, tagId: string) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    const tagIds = photo.tagIds.includes(tagId)
      ? photo.tagIds.filter((t) => t !== tagId)
      : [...photo.tagIds, tagId];
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, tagIds } : p)));
    patchPhoto(photoId, { tagIds });
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

      {photos.length === 0 ? (
        <div className="rounded-2xl border bg-card/40 p-12 text-center">
          <ImageIcon
            className="size-10 mx-auto text-muted-foreground/40 mb-4"
            strokeWidth={1.4}
          />
          <p className="text-muted-foreground mb-4">
            Brak zdjęć w bazie.
          </p>
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
            <article
              key={p.id}
              className="rounded-xl border bg-card overflow-hidden flex flex-col"
            >
              <div className="relative h-36 bg-secondary/50">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title ?? "panorama"}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="size-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-medium border">
                    {DIFFICULTY_LABELS[p.difficulty]}
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-2.5 flex-1 flex flex-col">
                <div>
                  <div className="font-medium text-sm truncate">
                    {p.title ?? <span className="text-muted-foreground italic">(bez tytułu)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                  </div>
                </div>

                <ToggleGroup
                  type="single"
                  size="sm"
                  value={p.difficulty}
                  onValueChange={(v) =>
                    v && updateDifficulty(p.id, v as Photo["difficulty"])
                  }
                  disabled={saving === p.id}
                  className="w-full"
                >
                  {(Object.keys(DIFFICULTY_LABELS) as Photo["difficulty"][]).map(
                    (d) => (
                      <ToggleGroupItem
                        key={d}
                        value={d}
                        aria-label={DIFFICULTY_LABELS[d]}
                        className="flex-1"
                      >
                        {DIFFICULTY_LABELS[d]}
                      </ToggleGroupItem>
                    ),
                  )}
                </ToggleGroup>

                {tags.length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setExpandedId((prev) => (prev === p.id ? null : p.id))
                      }
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                    >
                      {expandedId === p.id ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )}
                      Tagi ({p.tagIds.length})
                    </button>
                    {expandedId === p.id && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((tag) => {
                          const active = p.tagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(p.id, tag.id)}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity",
                                active ? "opacity-100" : "opacity-40 hover:opacity-70",
                              )}
                              style={{
                                background: tag.color + "33",
                                color: tag.color,
                                borderColor: tag.color + "66",
                              }}
                            >
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 mt-auto">
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("pl-PL")}
                  </span>
                  <Button
                    onClick={() => setPendingDelete(p)}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Usuń
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć zdjęcie?</DialogTitle>
            <DialogDescription>
              Tej operacji nie można cofnąć. Zdjęcie {pendingDelete?.title ?? "(bez tytułu)"} zostanie trwale usunięte z bazy.
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
