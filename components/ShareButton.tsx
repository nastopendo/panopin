"use client";

import { useState } from "react";

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
    <button
      onClick={handleShare}
      className="w-full px-6 py-3 bg-zinc-800 text-white rounded-xl font-semibold hover:bg-zinc-700 transition-colors border border-zinc-700"
    >
      {copied ? "Skopiowano link ✓" : "Udostępnij wyniki"}
    </button>
  );
}
