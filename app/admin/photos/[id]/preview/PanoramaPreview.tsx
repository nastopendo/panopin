"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { TileManifest } from "@/components/panorama/Viewer";

const PanoramaViewer = dynamic(() => import("@/components/panorama/Viewer"), { ssr: false });

interface Props {
  photoId: string;
  title: string | null;
  lat: number;
  lng: number;
  manifest: TileManifest | null;
}

export default function PanoramaPreview({ photoId, title, lat, lng, manifest }: Props) {
  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 120px)" }}>
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/admin/photos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Powrót do listy
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-sm font-medium truncate">
          {title ?? <span className="italic text-muted-foreground">(bez tytułu)</span>}
        </span>
        <span className="text-xs text-muted-foreground font-mono ml-auto shrink-0">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border">
        {manifest ? (
          <PanoramaViewer key={photoId} tilesManifest={manifest} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Brak kafelków dla tego zdjęcia.
          </div>
        )}
      </div>
    </div>
  );
}
