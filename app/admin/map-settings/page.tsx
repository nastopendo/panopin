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

export default function MapSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/map-settings")
      .then((r) => r.json())
      .then((data) => {
        const s: Settings = {
          centerLat: data.centerLat,
          centerLng: data.centerLng,
          defaultZoom: data.defaultZoom,
          mapStyle: data.mapStyle,
        };
        setSettings(s);
        setDraft(s);
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
          Domyślne położenie i zoom — przeciągnij i przybliż mapę do wybranego obszaru
        </div>
        <div className="rounded-xl overflow-hidden border border-zinc-200 h-[420px]">
          <AdminMap
            key={draft.mapStyle}
            initialLat={draft.centerLat}
            initialLng={draft.centerLng}
            initialZoom={draft.defaultZoom}
            mapStyle={draft.mapStyle}
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
  onMoveEnd: (lat: number, lng: number, zoom: number) => void;
}

function AdminMap({ initialLat, initialLng, initialZoom, mapStyle, onMoveEnd }: AdminMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleSpec(mapStyle),
      center: [initialLng, initialLat],
      zoom: initialZoom,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("moveend", () => {
      const { lat, lng } = map.getCenter();
      onMoveEnd(
        parseFloat(lat.toFixed(6)),
        parseFloat(lng.toFixed(6)),
        parseFloat(map.getZoom().toFixed(2)),
      );
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // deps intentionally empty — props are initial values; style change handled via key

  return <div ref={containerRef} className="w-full h-full" />;
}
