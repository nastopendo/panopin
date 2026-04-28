"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Check, Loader2, Map as MapIcon, Satellite } from "lucide-react";
import { getMapStyleSpec, type MapStyle } from "@/lib/map-styles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Settings {
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  mapStyle: MapStyle;
}

interface PhotoMarker {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  lat: number;
  lng: number;
}

export default function MapSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [photos, setPhotos] = useState<PhotoMarker[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/map-settings").then((r) => r.json()),
      fetch("/api/admin/photos").then((r) => r.json()),
    ])
      .then(([settingsData, photosData]: [Settings, PhotoMarker[]]) => {
        const s: Settings = {
          centerLat: settingsData.centerLat,
          centerLng: settingsData.centerLng,
          defaultZoom: settingsData.defaultZoom,
          mapStyle: settingsData.mapStyle,
        };
        setSettings(s);
        setDraft(s);
        setPhotos(photosData);
      })
      .catch(() => setError("Nie można wczytać ustawień"));
  }, []);

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
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/map-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSettings(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Ustawienia mapy</h1>
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
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-success text-sm font-medium">
              <Check className="size-4" />
              Zapisano
            </span>
          )}
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
        </div>
      </header>

      {error && !saved && (
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
            onValueChange={(v) => v && setDraft((d) => d && { ...d, mapStyle: v as MapStyle })}
          >
            <ToggleGroupItem value="street" aria-label="Ulica">
              <MapIcon className="size-4" />
              Ulica
            </ToggleGroupItem>
            <ToggleGroupItem value="satellite" aria-label="Satelita">
              <Satellite className="size-4" />
              Satelita
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domyślne położenie i zoom</CardTitle>
          <p className="text-sm text-muted-foreground">
            Przeciągnij i przybliż mapę do wybranego obszaru. Markery pokazują wszystkie zdjęcia w bazie ({photos.length}) — kliknij, aby zobaczyć podgląd.
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
                    d && { ...d, centerLat: lat, centerLng: lng, defaultZoom: zoom },
                )
              }
            />
          </div>
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <Stat label="Szerokość" value={draft.centerLat.toFixed(4)} />
            <Stat label="Długość" value={draft.centerLng.toFixed(4)} />
            <Stat label="Zoom" value={draft.defaultZoom.toFixed(1)} />
          </dl>
        </CardContent>
      </Card>
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

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

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
      const popupEl = document.createElement("div");
      popupEl.style.cssText = "min-width: 180px; text-align: center;";

      if (photo.thumbnailUrl) {
        const img = document.createElement("img");
        img.src = photo.thumbnailUrl;
        img.alt = "";
        img.loading = "lazy";
        img.style.cssText =
          "width: 100%; max-width: 220px; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; display: block;";
        popupEl.appendChild(img);
      }

      const titleEl = document.createElement("div");
      titleEl.style.cssText = "font-size: 12px; font-weight: 500; color: #18181b;";
      titleEl.textContent = photo.title ?? "(bez tytułu)";
      popupEl.appendChild(titleEl);

      const coordsEl = document.createElement("div");
      coordsEl.style.cssText =
        "font-size: 11px; color: #71717a; font-family: ui-monospace, monospace; margin-top: 2px;";
      coordsEl.textContent = `${photo.lat.toFixed(4)}, ${photo.lng.toFixed(4)}`;
      popupEl.appendChild(coordsEl);

      const marker = new maplibregl.Marker({ color: "#f59e0b" })
        .setLngLat([photo.lng, photo.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25, closeButton: true }).setDOMContent(popupEl),
        )
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [photos]);

  return <div ref={containerRef} className="w-full h-full" />;
}
