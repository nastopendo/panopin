"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyleSpec, type MapStyle } from "@/lib/map-styles";

interface ResultPoint {
  guessLat: number;
  guessLng: number;
  actualLat: number;
  actualLng: number;
}

interface Props {
  results: ResultPoint[];
  mapStyle?: MapStyle;
  className?: string;
}

function makeNumberEl(n: number, bg: string): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = [
    "width:22px;height:22px;border-radius:50%;",
    `background:${bg};border:2px solid white;`,
    "display:flex;align-items:center;justify-content:center;",
    "color:white;font-size:11px;font-weight:700;",
    "box-shadow:0 1px 4px rgba(0,0,0,.45);",
    "cursor:default;",
  ].join("");
  el.textContent = String(n);
  return el;
}

export default function ResultsMap({ results, mapStyle = "street", className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || results.length === 0) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleSpec(mapStyle),
      center: [19.5, 52.0],
      zoom: 5,
      interactive: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Lines connecting guess ↔ actual for every step
      map.addSource("result-lines", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: results.map((r) => ({
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: [
                [r.guessLng, r.guessLat],
                [r.actualLng, r.actualLat],
              ],
            },
          })),
        },
      });

      map.addLayer({
        id: "result-lines-layer",
        type: "line",
        source: "result-lines",
        paint: { "line-color": "#94a3b8", "line-width": 2, "line-dasharray": [4, 3] },
      });

      // Numbered markers + fit bounds
      const bounds = new maplibregl.LngLatBounds();

      results.forEach((r, i) => {
        const n = i + 1;

        new maplibregl.Marker({ element: makeNumberEl(n, "#ef4444") })
          .setLngLat([r.guessLng, r.guessLat])
          .addTo(map);

        new maplibregl.Marker({ element: makeNumberEl(n, "#22c55e") })
          .setLngLat([r.actualLng, r.actualLat])
          .addTo(map);

        bounds.extend([r.guessLng, r.guessLat]);
        bounds.extend([r.actualLng, r.actualLat]);
      });

      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 800 });
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only once — results don't change after mount

  return <div ref={containerRef} className={className ?? "w-full h-full"} />;
}
