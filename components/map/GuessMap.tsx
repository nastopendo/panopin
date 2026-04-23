"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface GuessResult {
  lat: number;
  lng: number;
}

interface Props {
  onConfirm: (guess: GuessResult) => void;
  disabled?: boolean;
  /** Highlight actual location after round ends */
  actualLocation?: GuessResult;
  className?: string;
}

export default function GuessMap({ onConfirm, disabled, actualLocation, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [pin, setPin] = useState<GuessResult | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [19.5, 52.0], // Poland
      zoom: 5,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("click", (e) => {
      if (disabled) return;
      const { lat, lng } = e.lngLat;

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: "#ef4444" })
          .setLngLat([lng, lat])
          .addTo(map);
      }
      setPin({ lat, lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Show actual location marker after guess
  useEffect(() => {
    if (!actualLocation || !mapRef.current) return;

    new maplibregl.Marker({ color: "#22c55e" })
      .setLngLat([actualLocation.lng, actualLocation.lat])
      .addTo(mapRef.current);

    // Draw line between guess and actual
    if (pin && mapRef.current.getSource("guess-line") === undefined) {
      mapRef.current.addSource("guess-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [pin.lng, pin.lat],
              [actualLocation.lng, actualLocation.lat],
            ],
          },
        },
      });
      mapRef.current.addLayer({
        id: "guess-line",
        type: "line",
        source: "guess-line",
        paint: { "line-color": "#94a3b8", "line-width": 2, "line-dasharray": [3, 3] },
      });
    }
  }, [actualLocation, pin]);

  return (
    <div className={`relative ${className ?? "w-full h-full"}`}>
      <div ref={containerRef} className="w-full h-full" />

      {pin && !disabled && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            onClick={() => onConfirm(pin)}
            className="bg-zinc-900 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg hover:bg-zinc-700 transition-colors"
          >
            Potwierdź miejsce
          </button>
        </div>
      )}

      {!pin && !disabled && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-white/80 backdrop-blur text-zinc-600 px-4 py-2 rounded-full text-xs shadow">
            Kliknij na mapie aby zaznaczyć miejsce
          </div>
        </div>
      )}
    </div>
  );
}
