"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyleSpec, type MapStyle } from "@/lib/map-styles";

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
        <h1 className="text-2xl font-bold mb-6">Ustawienia mapy</h1>
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="text-zinc-500">Ładowanie…</div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ustawienia mapy</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-emerald-600 text-sm font-medium">Zapisano ✓</span>}
          {error && <span className="text-red-500 text-sm">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Zapisuję…" : "Zapisz"}
          </button>
        </div>
      </div>

      {/* Style toggle */}
      <div>
        <div className="text-sm font-medium text-zinc-700 mb-2">Styl mapy</div>
        <div className="flex gap-2">
          {(["street", "satellite"] as MapStyle[]).map((s) => (
            <button
              key={s}
              onClick={() => setDraft((d) => d && { ...d, mapStyle: s })}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                draft.mapStyle === s
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {s === "street" ? "Ulica" : "Satelita"}
            </button>
          ))}
        </div>
      </div>

      {/* Map editor — key forces remount when style changes, preserving current position */}
      <div>
        <div className="text-sm font-medium text-zinc-700 mb-2">
          Domyślne położenie i zoom — przeciągnij i przybliż mapę do wybranego obszaru.
          Markery pokazują wszystkie zdjęcia w bazie ({photos.length}) — kliknij, aby zobaczyć podgląd.
        </div>
        <div className="rounded-xl overflow-hidden border border-zinc-200 h-[420px]">
          <AdminMap
            key={draft.mapStyle}
            initialLat={draft.centerLat}
            initialLng={draft.centerLng}
            initialZoom={draft.defaultZoom}
            mapStyle={draft.mapStyle}
            photos={photos}
            onMoveEnd={(lat, lng, zoom) =>
              setDraft((d) => d && { ...d, centerLat: lat, centerLng: lng, defaultZoom: zoom })
            }
          />
        </div>
        <div className="mt-2 text-xs text-zinc-500 font-mono">
          lat: {draft.centerLat.toFixed(4)}, lng: {draft.centerLng.toFixed(4)}, zoom:{" "}
          {draft.defaultZoom.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

// ─── Admin map component ──────────────────────────────────────────────────────

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
  }, []); // deps intentionally empty — props are initial values; style change handled via key

  // Sync photo markers when the photos list changes
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

      const marker = new maplibregl.Marker({ color: "#3b82f6" })
        .setLngLat([photo.lng, photo.lat])
        .setPopup(new maplibregl.Popup({ offset: 25, closeButton: true }).setDOMContent(popupEl))
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [photos]);

  return <div ref={containerRef} className="w-full h-full" />;
}
