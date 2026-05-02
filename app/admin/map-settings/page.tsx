"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, Map as MapIcon, Pencil, Satellite } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { getMapStyleSpec, type MapStyle } from "@/lib/map-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker"),
  { ssr: false },
);

interface Settings {
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  mapStyle: MapStyle;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

type Difficulty = "easy" | "medium" | "hard" | "extreme";

interface PhotoMarker {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  lat: number;
  lng: number;
  difficulty: Difficulty;
  tagIds: string[];
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Łatwe",
  medium: "Średnie",
  hard: "Trudne",
  extreme: "Ekstremalne",
};

const DIFFICULTY_MARKER_COLORS: Record<Difficulty, string> = {
  easy: "#22c55e",
  medium: "#eab308",
  hard: "#ef4444",
  extreme: "#a855f7",
};

interface PhotoEditDraft {
  title: string;
  lat: string;
  lng: string;
  difficulty: Difficulty;
  tagIds: string[];
}

export default function MapSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [photos, setPhotos] = useState<PhotoMarker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo edit state
  const [photoEdit, setPhotoEdit] = useState<PhotoMarker | null>(null);
  const [photoDraft, setPhotoDraft] = useState<PhotoEditDraft>({
    title: "",
    lat: "",
    lng: "",
    difficulty: "medium",
    tagIds: [],
  });
  const [photoLatError, setPhotoLatError] = useState("");
  const [photoLngError, setPhotoLngError] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);

  // Ref so the global click handler can read latest photos
  const photosRef = useRef<PhotoMarker[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/map-settings").then((r) => r.json()),
      fetch("/api/admin/photos").then((r) => r.json()),
      fetch("/api/admin/tags").then((r) => r.json()),
    ])
      .then(
        ([settingsData, photosData, tagsData]: [
          Settings,
          PhotoMarker[],
          Tag[],
        ]) => {
          const s: Settings = {
            centerLat: settingsData.centerLat,
            centerLng: settingsData.centerLng,
            defaultZoom: settingsData.defaultZoom,
            mapStyle: settingsData.mapStyle,
          };
          setSettings(s);
          setDraft(s);
          setPhotos(photosData);
          setTags(tagsData);
        },
      )
      .catch(() => setError("Nie można wczytać ustawień"));
  }, []);

  const openPhotoEdit = useCallback((photo: PhotoMarker) => {
    setPhotoDraft({
      title: photo.title ?? "",
      lat: photo.lat.toString(),
      lng: photo.lng.toString(),
      difficulty: photo.difficulty,
      tagIds: [...photo.tagIds],
    });
    setPhotoLatError("");
    setPhotoLngError("");
    setPhotoEdit(photo);
  }, []);

  // Global click handler for the "Edytuj" button inside MapLibre popups
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest(
        "[data-edit-photo-id]",
      ) as HTMLElement | null;
      if (!el) return;
      const id = el.dataset.editPhotoId;
      const photo = photosRef.current.find((p) => p.id === id);
      if (photo) openPhotoEdit(photo);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openPhotoEdit]);

  function validatePhotoCoords(): boolean {
    let ok = true;
    const lat = parseFloat(photoDraft.lat);
    const lng = parseFloat(photoDraft.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setPhotoLatError("Musi być liczbą od -90 do 90");
      ok = false;
    } else setPhotoLatError("");
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setPhotoLngError("Musi być liczbą od -180 do 180");
      ok = false;
    } else setPhotoLngError("");
    return ok;
  }

  async function savePhotoEdit() {
    if (!photoEdit || !validatePhotoCoords()) return;
    setPhotoSaving(true);
    const lat = parseFloat(photoDraft.lat);
    const lng = parseFloat(photoDraft.lng);
    const res = await fetch(`/api/admin/photos/${photoEdit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: photoDraft.title.trim() || null,
        lat,
        lng,
        difficulty: photoDraft.difficulty,
        tagIds: photoDraft.tagIds,
      }),
    });
    setPhotoSaving(false);
    if (!res.ok) {
      toast.error("Nie udało się zapisać zmian");
      return;
    }
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoEdit.id
          ? {
              ...p,
              title: photoDraft.title.trim() || null,
              lat,
              lng,
              difficulty: photoDraft.difficulty,
              tagIds: photoDraft.tagIds,
            }
          : p,
      ),
    );
    setPhotoEdit(null);
    toast.success("Zdjęcie zaktualizowane");
  }

  const dirty =
    !!settings &&
    !!draft &&
    (settings.centerLat !== draft.centerLat ||
      settings.centerLng !== draft.centerLng ||
      settings.defaultZoom !== draft.defaultZoom ||
      settings.mapStyle !== draft.mapStyle);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/map-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSettings(draft);
      toast.success("Ustawienia mapy zapisane");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">
          Ustawienia mapy
        </h1>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Ładowanie ustawień…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ustawienia mapy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Domyślny widok mapy graczy podczas zgadywania.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          variant="brand"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Zapisuję…
            </>
          ) : (
            "Zapisz"
          )}
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Styl mapy</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            value={draft.mapStyle}
            onValueChange={(v) =>
              v && setDraft((d) => d && { ...d, mapStyle: v as MapStyle })
            }
          >
            <ToggleGroupItem value="street" aria-label="Ulica">
              <MapIcon className="size-4 mr-1" />
              Ulica
            </ToggleGroupItem>
            <ToggleGroupItem value="satellite" aria-label="Satelita">
              <Satellite className="size-4 mr-1" />
              Satelita
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domyślne położenie i zoom</CardTitle>
          <p className="text-sm text-muted-foreground">
            Przeciągnij i przybliż mapę do wybranego obszaru. Markery pokazują
            zdjęcia ({photos.length}) — kliknij marker, aby edytować.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl overflow-hidden border h-[420px]">
            <AdminMap
              key={draft.mapStyle}
              initialLat={draft.centerLat}
              initialLng={draft.centerLng}
              initialZoom={draft.defaultZoom}
              mapStyle={draft.mapStyle}
              photos={photos}
              onMoveEnd={(lat, lng, zoom) =>
                setDraft(
                  (d) =>
                    d && {
                      ...d,
                      centerLat: lat,
                      centerLng: lng,
                      defaultZoom: zoom,
                    },
                )
              }
            />
          </div>
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <Stat label="Szerokość" value={draft.centerLat.toFixed(4)} />
            <Stat label="Długość" value={draft.centerLng.toFixed(4)} />
            <Stat label="Zoom" value={draft.defaultZoom.toFixed(1)} />
          </dl>
          <div className="flex flex-wrap gap-3 pt-1">
            {(Object.entries(DIFFICULTY_MARKER_COLORS) as [keyof typeof DIFFICULTY_MARKER_COLORS, string][]).map(([d, color]) => (
              <div key={d} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-3 rounded-full shrink-0" style={{ background: color }} />
                {DIFFICULTY_LABELS[d]}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Photo edit dialog ── */}
      <Dialog
        open={photoEdit !== null}
        onOpenChange={(open) => !open && setPhotoEdit(null)}
      >
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
              <Label htmlFor="ms-edit-title">Tytuł</Label>
              <Input
                id="ms-edit-title"
                placeholder="(bez tytułu)"
                value={photoDraft.title}
                onChange={(e) =>
                  setPhotoDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ms-edit-lat">Szerokość (lat)</Label>
                <Input
                  id="ms-edit-lat"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={photoDraft.lat}
                  onChange={(e) => {
                    setPhotoDraft((d) => ({ ...d, lat: e.target.value }));
                    setPhotoLatError("");
                  }}
                  className={photoLatError ? "border-destructive" : ""}
                />
                {photoLatError && (
                  <p className="text-xs text-destructive">{photoLatError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ms-edit-lng">Długość (lng)</Label>
                <Input
                  id="ms-edit-lng"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={photoDraft.lng}
                  onChange={(e) => {
                    setPhotoDraft((d) => ({ ...d, lng: e.target.value }));
                    setPhotoLngError("");
                  }}
                  className={photoLngError ? "border-destructive" : ""}
                />
                {photoLngError && (
                  <p className="text-xs text-destructive">{photoLngError}</p>
                )}
              </div>
            </div>

            {/* Location picker */}
            <div className="space-y-1.5">
              <Label>Lokalizacja na mapie</Label>
              <p className="text-xs text-muted-foreground">
                Kliknij na mapie lub przeciągnij marker.
              </p>
              <div className="rounded-lg overflow-hidden border h-48">
                <LocationPicker
                  key={photoEdit?.id}
                  lat={
                    isNaN(parseFloat(photoDraft.lat))
                      ? null
                      : parseFloat(photoDraft.lat)
                  }
                  lng={
                    isNaN(parseFloat(photoDraft.lng))
                      ? null
                      : parseFloat(photoDraft.lng)
                  }
                  mapStyle={draft.mapStyle}
                  onChange={(lat, lng) => {
                    setPhotoDraft((d) => ({
                      ...d,
                      lat: lat.toString(),
                      lng: lng.toString(),
                    }));
                    setPhotoLatError("");
                    setPhotoLngError("");
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
                value={photoDraft.difficulty}
                onValueChange={(v) =>
                  v &&
                  setPhotoDraft((d) => ({ ...d, difficulty: v as Difficulty }))
                }
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
                    const active = photoDraft.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() =>
                          setPhotoDraft((d) => ({
                            ...d,
                            tagIds: active
                              ? d.tagIds.filter((t) => t !== tag.id)
                              : [...d.tagIds, tag.id],
                          }))
                        }
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium border transition-opacity",
                          active
                            ? "opacity-100"
                            : "opacity-35 hover:opacity-60",
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
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoEdit(null)}>
              Anuluj
            </Button>
            <Button
              variant="brand"
              onClick={savePhotoEdit}
              disabled={photoSaving}
            >
              {photoSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Pencil className="size-4" />
              )}
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card/40 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

interface AdminMapProps {
  initialLat: number;
  initialLng: number;
  initialZoom: number;
  mapStyle: MapStyle;
  photos: PhotoMarker[];
  onMoveEnd: (lat: number, lng: number, zoom: number) => void;
}

function AdminMap({
  initialLat,
  initialLng,
  initialZoom,
  mapStyle,
  photos,
  onMoveEnd,
}: AdminMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleSpec(mapStyle),
      center: [initialLng, initialLat],
      zoom: initialZoom,
    });
    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("moveend", () => {
      const { lat, lng } = map.getCenter();
      onMoveEnd(
        parseFloat(lat.toFixed(6)),
        parseFloat(lng.toFixed(6)),
        parseFloat(map.getZoom().toFixed(2)),
      );
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    photos.forEach((photo) => {
      // Root wrapper — no padding (thumbnail bleeds to edges)
      const popupEl = document.createElement("div");

      // Thumbnail
      if (photo.thumbnailUrl) {
        const img = document.createElement("img");
        img.src = photo.thumbnailUrl;
        img.alt = "";
        img.loading = "lazy";
        img.style.cssText =
          "width: 100%; height: 110px; object-fit: cover; display: block;";
        popupEl.appendChild(img);
      }

      // Body
      const bodyEl = document.createElement("div");
      bodyEl.style.cssText = "padding: 11px 4px 4px;";

      const titleEl = document.createElement("div");
      titleEl.style.cssText =
        "font-size: 13px; font-weight: 500; color: var(--color-muted-foreground); " +
        "white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 196px; " +
        "padding-right: 24px;"; // space for close button
      titleEl.textContent = photo.title ?? "(bez tytułu)";
      bodyEl.appendChild(titleEl);

      const coordsEl = document.createElement("div");
      coordsEl.style.cssText =
        "font-size: 11px; color: var(--color-muted-foreground); " +
        "font-family: var(--font-mono); margin-top: 3px; letter-spacing: 0.01em;";
      coordsEl.textContent = `${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)}`;
      bodyEl.appendChild(coordsEl);

      const difficultyEl = document.createElement("div");
      const markerColor = DIFFICULTY_MARKER_COLORS[photo.difficulty];
      difficultyEl.style.cssText =
        `display: inline-block; margin-top: 6px; padding: 1px 8px; border-radius: 9999px; ` +
        `font-size: 11px; font-weight: 600; ` +
        `background: ${markerColor}22; color: ${markerColor}; border: 1px solid ${markerColor}55;`;
      difficultyEl.textContent = DIFFICULTY_LABELS[photo.difficulty];
      bodyEl.appendChild(difficultyEl);

      // Divider
      const dividerEl = document.createElement("div");
      dividerEl.style.cssText =
        "height: 1px; background: var(--color-border); margin: 10px -14px 10px;";
      bodyEl.appendChild(dividerEl);

      // Actions
      const actionsEl = document.createElement("div");
      actionsEl.style.cssText = "display: flex; gap: 6px;";

      const btnBase =
        "display: inline-flex; align-items: center; justify-content: center; " +
        "height: 34px; padding: 0 14px; border-radius: var(--radius-md); " +
        "font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; " +
        "border: none; text-decoration: none; transition: opacity 150ms; " +
        "font-family: var(--font-sans); letter-spacing: 0.02em; flex: 1;";

      const previewLink = document.createElement("a");
      previewLink.href = `/admin/photos/${photo.id}/preview`;
      previewLink.target = "_blank";
      previewLink.rel = "noopener noreferrer";
      previewLink.textContent = "Podgląd 360°";
      previewLink.style.cssText =
        btnBase +
        "color: var(--color-secondary-foreground); " +
        "background: var(--color-secondary);";

      const editBtn = document.createElement("button");
      editBtn.dataset.editPhotoId = photo.id;
      editBtn.textContent = "Edytuj";
      editBtn.style.cssText =
        btnBase +
        "color: var(--color-brand-foreground); " +
        "background: var(--color-brand);";

      actionsEl.appendChild(previewLink);
      actionsEl.appendChild(editBtn);
      bodyEl.appendChild(actionsEl);
      popupEl.appendChild(bodyEl);

      const marker = new maplibregl.Marker({ color: DIFFICULTY_MARKER_COLORS[photo.difficulty] })
        .setLngLat([photo.lng, photo.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25, closeButton: true }).setDOMContent(
            popupEl,
          ),
        )
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [photos]);

  return <div ref={containerRef} className="w-full h-full" />;
}
