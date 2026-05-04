"use client";

import { useState } from "react";
import { ChevronDown, Clock, MapPin, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  multEasy: number;
  multMedium: number;
  multHard: number;
  multExtreme: number;
  maxTimeBonus: number;
}

export function ScoringInfoPanel({ multEasy, multMedium, multHard, multExtreme, maxTimeBonus }: Props) {
  const [open, setOpen] = useState(false);

  const fmt = (n: number) => `×${n.toFixed(1).replace(".", ",")}`;

  return (
    <div className="mt-10 rounded-2xl border bg-card/40 backdrop-blur overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-left hover:bg-card/60 transition-colors"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Jak liczymy punkty?
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul className="px-4 sm:px-5 pb-4 space-y-2.5 border-t">
          <li className="flex items-start gap-3 text-sm pt-4">
            <MapPin className="size-4 mt-0.5 shrink-0 text-brand" />
            <span>
              <span className="font-medium">Odległość</span> — im bliżej prawdziwego miejsca, tym więcej punktów. Maksymalnie 5&nbsp;000 bazowych za trafienie w punkt.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <Zap className="size-4 mt-0.5 shrink-0 text-warning" />
            <span>
              <span className="font-medium">Poziom trudności</span> — wynik mnożony przez:{" "}
              łatwy&nbsp;{fmt(multEasy)} · średni&nbsp;{fmt(multMedium)} · trudny&nbsp;{fmt(multHard)} · ekstremalny&nbsp;{fmt(multExtreme)}.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm">
            <Clock className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">Czas</span> — szybka odpowiedź daje do{" "}
              {maxTimeBonus} punktów bonusu za każde zdjęcie.
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}
