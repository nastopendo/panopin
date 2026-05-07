"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAnnouncementDismissed, dismissAnnouncement } from "@/lib/announcement-dismiss";

interface Props {
  title: string;
  body: string; // sanitized HTML
  imageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  updatedAt: string; // ISO
}

export function AnnouncementBannerClient(props: Props) {
  const { title, body, imageUrl, ctaText, ctaUrl, updatedAt } = props;
  const hidden = useSyncExternalStore(
    subscribeToAnnouncementDismissal,
    () => isAnnouncementDismissed(updatedAt),
    () => true,
  );

  if (hidden) return null;

  const showCta = ctaText && ctaUrl;
  const isExternalCta = ctaUrl?.startsWith("http");

  function handleClose() {
    dismissAnnouncement(updatedAt);
    window.dispatchEvent(new Event("announcement-dismissed"));
  }

  return (
    <section
      className="w-full max-w-4xl mx-auto px-4 sm:px-6"
    >
      <div className="relative rounded-2xl border bg-card/60 backdrop-blur-md overflow-hidden">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Zamknij ogłoszenie"
          className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
        >
          <X className="size-4" />
        </button>
        <div
          className={imageUrl ? "grid md:grid-cols-2 gap-0" : "grid grid-cols-1"}
        >
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover aspect-video md:aspect-auto"
            />
          )}
          <div className="p-6 sm:p-8 pr-10 flex flex-col gap-3 justify-center">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <div
              className="prose prose-sm sm:prose-base max-w-none text-muted-foreground prose-p:my-1.5 prose-headings:text-foreground prose-strong:text-foreground prose-blockquote:text-foreground prose-a:text-brand"
              dangerouslySetInnerHTML={{ __html: body }}
            />
            {showCta && (
              <div className="pt-2">
                <Button asChild variant="brand">
                  {isExternalCta ? (
                    <a href={ctaUrl!} target="_blank" rel="noopener noreferrer">
                      {ctaText}
                      <ArrowRight />
                    </a>
                  ) : (
                    <Link href={ctaUrl!}>
                      {ctaText}
                      <ArrowRight />
                    </Link>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function subscribeToAnnouncementDismissal(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("announcement-dismissed", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("announcement-dismissed", onStoreChange);
  };
}
