"use client";

import { useEffect, useRef } from "react";
import type { Viewer as ViewerType } from "@photo-sphere-viewer/core";
import "@photo-sphere-viewer/core/index.css";

export interface TileManifest {
  photoId: string;
  baseUrl: string;
  heading?: number;
  /** Default horizontal view angle in degrees (-180…180). Null/undefined falls back to -90°. */
  defaultYaw?: number | null;
  levels: Array<{
    faceSize: number;
    nbTiles: number;
  }>;
}

interface Props {
  equirectUrl?: string;
  tilesManifest?: TileManifest;
  /** Override initial yaw in degrees. Takes precedence over tilesManifest.defaultYaw. */
  defaultYaw?: number;
  onViewerReady?: (viewer: ViewerType) => void;
  className?: string;
}

export default function PanoramaViewer({ equirectUrl, tilesManifest, defaultYaw, onViewerReady, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerType | null>(null);
  const onViewerReadyRef = useRef(onViewerReady);
  onViewerReadyRef.current = onViewerReady;

  useEffect(() => {
    if (!containerRef.current) return;
    if (!equirectUrl && !tilesManifest) return;

    let destroyed = false;

    async function init() {
      const { Viewer } = await import("@photo-sphere-viewer/core");
      if (destroyed || !containerRef.current) return;

      // Priority: explicit prop > tilesManifest.defaultYaw > -90° (center of first fisheye lens)
      const yawDeg = defaultYaw ?? tilesManifest?.defaultYaw ?? -90;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: any = {
        container: containerRef.current,
        defaultYaw: (yawDeg * Math.PI) / 180,
        touchmoveTwoFingers: false,
        navbar: ["zoom", "fullscreen"],
        loadingTxt: "Ładowanie…",
      };

      if (tilesManifest) {
        const { CubemapTilesAdapter } = await import(
          "@photo-sphere-viewer/cubemap-tiles-adapter"
        );
        config.adapter = CubemapTilesAdapter;
        const base = `${tilesManifest!.baseUrl}/tiles/${tilesManifest!.photoId}`;
        config.panorama = {
          baseUrl: {
            front:  `${base}/front/0/0_0.jpg`,
            back:   `${base}/back/0/0_0.jpg`,
            left:   `${base}/left/0/0_0.jpg`,
            right:  `${base}/right/0/0_0.jpg`,
            top:    `${base}/top/0/0_0.jpg`,
            bottom: `${base}/bottom/0/0_0.jpg`,
          },
          levels: tilesManifest.levels,
          tileUrl: (face: string, col: number, row: number, level: number) =>
            `${base}/${face}/${level}/${row}_${col}.jpg`,
        };
      } else {
        config.panorama = equirectUrl;
      }

      const viewer = new Viewer(config);

      viewer.addEventListener("panorama-error", (e) => {
        console.error("[PanoramaViewer]", e);
      });

      viewerRef.current = viewer;
      onViewerReadyRef.current?.(viewer);
    }

    init().catch((e) => console.error("[PanoramaViewer] init error:", e));

    return () => {
      destroyed = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // props are initial values — photo changes handled via key prop in parent

  return (
    <div
      ref={containerRef}
      className={className ?? "w-full h-full"}
      style={{ minHeight: "300px", touchAction: "none" }}
    />
  );
}
