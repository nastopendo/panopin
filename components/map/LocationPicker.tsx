"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyleSpec, type MapStyle } from "@/lib/map-styles";

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  mapStyle?: MapStyle;
  className?: string;
}

export default function LocationPicker({ lat, lng, onChange, mapStyle = "street", className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const validLat = lat !== null && !isNaN(lat) && lat >= -90 && lat <= 90;
    const validLng = lng !== null && !isNaN(lng) && lng >= -180 && lng <= 180;
    const initLat = validLat ? lat! : 52;
    const initLng = validLng ? lng! : 19.5;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyleSpec(mapStyle),
      center: [initLng, initLat],
      zoom: 13,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new maplibregl.Marker({ color: "#f59e0b", draggable: true })
      .setLngLat([initLng, initLat])
      .addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLngLat();
      onChangeRef.current(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
    });

    map.on("click", (e) => {
      marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
      onChangeRef.current(parseFloat(e.lngLat.lat.toFixed(6)), parseFloat(e.lngLat.lng.toFixed(6)));
    });

    // MapLibre needs a resize tick after dialog animation
    setTimeout(() => map.resize(), 100);

    return () => {
      marker.remove();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // use key prop to reinitialize for a different photo

  return <div ref={containerRef} className={className ?? "w-full h-full"} />;
}
