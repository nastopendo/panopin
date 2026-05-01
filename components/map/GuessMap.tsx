"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyleSpec, type MapStyle } from "@/lib/map-styles";

export interface GuessResult {
  lat: number;
  lng: number;
}

interface Props {
  onConfirm: (guess: GuessResult) => void;
  disabled?: boolean;
  /** Actual location revealed after guess — triggers green pin + line + fitBounds */
  actualLocation?: GuessResult;
  /** Increment each step to clear markers and line from the previous round */
  stepKey?: number;
  /** Default map center [lng, lat] */
  initialCenter?: [number, number];
  /** Default zoom level */
  initialZoom?: number;
  /** Map visual style */
  mapStyle?: MapStyle;
  className?: string;
  /** Called whenever the pending pin changes (before confirm) */
  onPinChange?: (pin: GuessResult | null) => void;
}

export default function GuessMap({
  onConfirm,
  disabled,
  actualLocation,
  stepKey,
  initialCenter = [19.5, 52.0],
  initialZoom = 5,
  mapStyle = "street",
  className,
  onPinChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const guessMarkerRef = useRef<maplibregl.Marker | null>(null);
  const actualMarkerRef = useRef<maplibregl.Marker | null>(null);
  const disabledRef = useRef(disabled);
  const onPinChangeRef = useRef(onPinChange);
  const initialCenterRef = useRef(initialCenter);
  const initialZoomRef = useRef(initialZoom);
  const [pin, setPin] = useState<GuessResult | null>(null);

  useEffect(() => {
    onPinChangeRef.current = onPinChange;
  }, [onPinChange]);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  useEffect(() => {
    initialCenterRef.current = initialCenter;
  }, [initialCenter]);
  useEffect(() => {
    initialZoomRef.current = initialZoom;
  }, [initialZoom]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleSpec(mapStyle),
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      const el = map
        .getContainer()
        .querySelector<HTMLDetailsElement>(".maplibregl-ctrl-attrib");
      if (el) {
        el.removeAttribute("open");
        el.classList.remove("maplibregl-compact-show");
      }
    });

    map.on("click", (e) => {
      if (disabledRef.current) return;
      const { lat, lng } = e.lngLat;

      if (guessMarkerRef.current) {
        guessMarkerRef.current.setLngLat([lng, lat]);
      } else {
        guessMarkerRef.current = new maplibregl.Marker({ color: "#ef4444" })
          .setLngLat([lng, lat])
          .addTo(map);
      }
      setPin({ lat, lng });
      onPinChangeRef.current?.({ lat, lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      guessMarkerRef.current = null;
      actualMarkerRef.current = null;
    };
  }, []);

  // Reset state between steps
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    guessMarkerRef.current?.remove();
    guessMarkerRef.current = null;

    actualMarkerRef.current?.remove();
    actualMarkerRef.current = null;

    if (map.getLayer("guess-line")) map.removeLayer("guess-line");
    if (map.getSource("guess-line")) map.removeSource("guess-line");

    map.flyTo({
      center: initialCenterRef.current,
      zoom: initialZoomRef.current,
      duration: 600,
    });

    setPin(null);
    onPinChangeRef.current?.(null);
  }, [stepKey]);

  // Show actual location + line + fit bounds after guess
  useEffect(() => {
    const map = mapRef.current;
    if (!actualLocation || !map) return;

    // Green marker for actual location
    actualMarkerRef.current?.remove();
    actualMarkerRef.current = new maplibregl.Marker({ color: "#22c55e" })
      .setLngLat([actualLocation.lng, actualLocation.lat])
      .addTo(map);

    // Line from guess to actual — read position from the live marker (never stale)
    const gPos = guessMarkerRef.current?.getLngLat();
    if (gPos) {
      if (map.getLayer("guess-line")) map.removeLayer("guess-line");
      if (map.getSource("guess-line")) map.removeSource("guess-line");

      map.addSource("guess-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [gPos.lng, gPos.lat],
              [actualLocation.lng, actualLocation.lat],
            ],
          },
        },
      });
      map.addLayer({
        id: "guess-line",
        type: "line",
        source: "guess-line",
        paint: {
          "line-color": "#94a3b8",
          "line-width": 2,
          "line-dasharray": [3, 3],
        },
      });

      // Fit map to show both pins
      const bounds = new maplibregl.LngLatBounds()
        .extend([gPos.lng, gPos.lat])
        .extend([actualLocation.lng, actualLocation.lat]);
      map.fitBounds(bounds, {
        padding: 140,
        maxZoom: 30,
        duration: 900,
        linear: true,
      });
    }
  }, [actualLocation]);

  return (
    <div className={`relative ${className ?? "w-full h-full"}`}>
      <div ref={containerRef} className="w-full h-full" />

      {pin && !disabled && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={() => onConfirm(pin)}
            className="bg-brand text-brand-foreground px-5 py-2 rounded-full text-sm font-semibold shadow-lg hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Potwierdź miejsce
          </button>
        </div>
      )}

      {!pin && !disabled && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white/70 px-3 py-1.5 rounded-full text-xs shadow whitespace-nowrap">
            Kliknij aby zaznaczyć
          </div>
        </div>
      )}
    </div>
  );
}
