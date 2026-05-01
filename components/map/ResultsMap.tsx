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

export interface ResultsMapPhoto {
  photoId: string;
  tileBaseUrl: string;
  heading: number;
  defaultYaw?: number | null;
  tileLevels: Array<{ faceSize: number; nbTiles: number }>;
}

interface Props {
  results: ResultPoint[];
  photos?: ResultsMapPhoto[];
  onPhotoClick?: (index: number) => void;
  mapStyle?: MapStyle;
  className?: string;
}

function makeNumberEl(n: number, bg: string, clickable = false): HTMLElement {
  const circle = document.createElement("div");
  circle.style.cssText = [
    "width:22px;height:22px;border-radius:50%;",
    `background:${bg};border:2px solid white;`,
    "display:flex;align-items:center;justify-content:center;",
    "color:white;font-size:11px;font-weight:700;",
    "box-shadow:0 1px 4px rgba(0,0,0,.45);",
    clickable ? "cursor:pointer;transition:transform .15s;" : "cursor:default;",
  ].join("");
  circle.textContent = String(n);

  if (!clickable) return circle;

  // MapLibre positions the marker by setting `transform: translate(x,y)` on the root element.
  // Applying scale or transition directly to that element causes lag during pan and jumps on hover.
  // Fix: outer wrapper is the MapLibre anchor (no transform/transition); inner circle handles visuals.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "width:22px;height:22px;";
  wrapper.title = "Kliknij, aby zobaczyć panoramę";
  circle.addEventListener("mouseenter", () => { circle.style.transform = "scale(1.25)"; });
  circle.addEventListener("mouseleave", () => { circle.style.transform = ""; });
  wrapper.appendChild(circle);
  return wrapper;
}

export default function ResultsMap({ results, photos, onPhotoClick, mapStyle = "street", className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || results.length === 0) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleSpec(mapStyle),
      center: [19.5, 52.0],
      zoom: 5,
      interactive: true,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      const el = map.getContainer().querySelector<HTMLDetailsElement>(".maplibregl-ctrl-attrib");
      if (el) {
        el.removeAttribute("open");
        el.classList.remove("maplibregl-compact-show");
      }

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
        const hasPhoto = !!(photos?.[i] && onPhotoClick);

        new maplibregl.Marker({ element: makeNumberEl(n, "#ef4444") })
          .setLngLat([r.guessLng, r.guessLat])
          .addTo(map);

        const actualEl = makeNumberEl(n, "#22c55e", hasPhoto);
        if (hasPhoto) {
          actualEl.addEventListener("click", () => onPhotoClick!(i));
        }
        new maplibregl.Marker({ element: actualEl })
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
