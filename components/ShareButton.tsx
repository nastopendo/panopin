"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  url: string;
  score: number;
}

export function ShareButton({ url, score }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = `Zdobyłem ${score.toLocaleString("pl-PL")} pkt w Panopin! Jak Ty?`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Panopin", text, url });
        return;
      } catch {
        // user cancelled or API unavailable — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <Button
      onClick={handleShare}
      variant="secondary"
      size="lg"
      className="w-full"
    >
      {copied ? (
        <>
          <Check className="text-success" />
          Skopiowano link
        </>
      ) : (
        <>
          <Share2 />
          Udostępnij wynik
        </>
      )}
    </Button>
  );
}
