"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  isAnnouncementDismissed,
  dismissAnnouncement,
} from "@/lib/announcement-dismiss";

interface ApiResponse {
  title: string;
  body: string;
  imageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  showOnHome: boolean;
  showOnLeaderboard: boolean;
  showAsPopup: boolean;
  updatedAt: string;
}

export function AnnouncementPopup() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/announcement")
      .then((r) => r.json())
      .then((row: ApiResponse | null) => {
        if (cancelled) return;
        if (!row || !row.showAsPopup) return;
        if (isAnnouncementDismissed(row.updatedAt)) return;
        setData(row);
        setOpen(true);
      })
      .catch(() => {
        // ignore — popup is non-critical
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && data) dismissAnnouncement(data.updatedAt);
  }

  if (!data) return null;

  const showCta = data.ctaText && data.ctaUrl;
  const isExternalCta = data.ctaUrl?.startsWith("http");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        {data.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.imageUrl}
            alt=""
            className="w-full aspect-video object-cover"
          />
        )}
        <div className="p-6 space-y-3">
          <DialogTitle className="text-xl">{data.title}</DialogTitle>
          <div
            className="prose prose-sm max-w-none text-muted-foreground prose-p:my-1.5 prose-headings:text-foreground prose-strong:text-foreground prose-blockquote:text-foreground prose-a:text-brand"
            dangerouslySetInnerHTML={{ __html: data.body }}
          />
          {showCta && (
            <div className="pt-2">
              <Button asChild variant="brand" className="w-full sm:w-auto">
                {isExternalCta ? (
                  <a
                    href={data.ctaUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {data.ctaText}
                    <ArrowRight />
                  </a>
                ) : (
                  <Link href={data.ctaUrl!}>
                    {data.ctaText}
                    <ArrowRight />
                  </Link>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
