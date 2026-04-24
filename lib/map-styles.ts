export type MapStyle = "street" | "satellite";

export const STREET_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    esri: {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "© Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
  },
  layers: [{ id: "satellite-layer", type: "raster" as const, source: "esri" }],
};

export function getMapStyleSpec(style: MapStyle) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (style === "satellite" ? SATELLITE_STYLE : STREET_STYLE) as any;
}
