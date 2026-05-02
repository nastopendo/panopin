"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  url: string;
  score: number;
  topPercent?: number | null;
}

export function ShareButton({ url, score, topPercent }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const scoreStr = score.toLocaleString("pl-PL");
    const text = topPercent !== null && topPercent !== undefined
      ? `Jestem w top ${topPercent}% graczy Panopin! Zdobyłem ${scoreStr} pkt z 5 lokalizacji. A ile Ty zdobędziesz?`
      : `Zdobyłem ${scoreStr} pkt w Panopin! A ile Ty zdobędziesz?`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Panopin", text, url });
        return;
      } catch {
        // user cancelled or API unavailable — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(`${text}\n\n${url}`);
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
