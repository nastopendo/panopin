"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Settings {
  maxDistanceM: number;
  timeLimitS: number;
  maxBaseScore: number;
  maxTimeBonus: number;
  scaleEasyM: number;
  scaleMediumM: number;
  scaleHardM: number;
  multEasy: number;
  multMedium: number;
  multHard: number;
}

type Difficulty = "easy" | "medium" | "hard";

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: "Łatwe",
  medium: "Średnie",
  hard: "Trudne",
};

const PREVIEW_DISTANCES = [0, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000];

function calcScore(
  distM: number,
  scale: number,
  mult: number,
  maxBase: number,
  maxDist: number,
): number {
  if (distM >= maxDist) return 0;
  return Math.round(maxBase * Math.exp(-distM / scale) * mult);
}

export default function ScoringSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/scoring-settings")
      .then((r) => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setDraft(data);
      })
      .catch(() => setError("Nie można wczytać ustawień punktacji"));
  }, []);

  const dirty =
    !!settings &&
    !!draft &&
    Object.keys(draft).some(
      (k) => draft[k as keyof Settings] !== settings[k as keyof Settings],
    );

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/scoring-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSettings(draft);
      toast.success("Ustawienia punktacji zapisane");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  function num(key: keyof Settings) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) setDraft((d) => d && { ...d, [key]: key.startsWith("mult") ? v : Math.round(v) });
    };
  }

  if (!draft) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Ustawienia punktacji</h1>
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Ładowanie…
          </div>
        )}
      </div>
    );
  }

  const difficulties: Difficulty[] = ["easy", "medium", "hard"];
  const scaleKeys: Record<Difficulty, keyof Settings> = {
    easy: "scaleEasyM",
    medium: "scaleMediumM",
    hard: "scaleHardM",
  };
  const multKeys: Record<Difficulty, keyof Settings> = {
    easy: "multEasy",
    medium: "multMedium",
    hard: "multHard",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ustawienia punktacji</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Konfiguracja krzywej punktacji i limitu czasu.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} variant="brand">
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Zapisuję…
            </>
          ) : (
            "Zapisz"
          )}
        </Button>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ogólne</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field
            id="maxDist"
            label="Max odległość (m)"
            hint="Powyżej tej odległości wynik = 0"
            value={draft.maxDistanceM}
            onChange={num("maxDistanceM")}
            min={100}
            max={100000}
            step={100}
          />
          <Field
            id="timeLimit"
            label="Czas na strzał (s)"
            hint="0 = brak limitu"
            value={draft.timeLimitS}
            onChange={num("timeLimitS")}
            min={0}
            max={300}
            step={5}
          />
          <Field
            id="maxBase"
            label="Maks. wynik bazowy"
            hint="Punkty za idealny strzał (bez czasu)"
            value={draft.maxBaseScore}
            onChange={num("maxBaseScore")}
            min={100}
            max={10000}
            step={100}
          />
          <Field
            id="maxBonus"
            label="Maks. bonus czasowy"
            hint="Punkty za odpowiedź w czasie 0s"
            value={draft.maxTimeBonus}
            onChange={num("maxTimeBonus")}
            min={0}
            max={1000}
            step={10}
          />
        </CardContent>
      </Card>

      {/* Per-difficulty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ustawienia per trudność</CardTitle>
          <p className="text-sm text-muted-foreground">
            Scale (m) — większy = wolniejszy spadek punktów z odległością. Mnożnik — zwiększa końcowy wynik.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {difficulties.map((d) => (
            <div key={d} className="grid grid-cols-2 gap-4 items-end">
              <Field
                id={`scale-${d}`}
                label={`${DIFF_LABELS[d]} — scale (m)`}
                value={draft[scaleKeys[d]] as number}
                onChange={num(scaleKeys[d])}
                min={10}
                max={50000}
                step={10}
              />
              <Field
                id={`mult-${d}`}
                label={`${DIFF_LABELS[d]} — mnożnik`}
                value={draft[multKeys[d]] as number}
                onChange={num(multKeys[d])}
                min={0.1}
                max={5}
                step={0.05}
                isFloat
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Podgląd krzywej (bez bonusu czasowego)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 pr-4 text-muted-foreground font-normal">
                    Odległość
                  </th>
                  {difficulties.map((d) => (
                    <th
                      key={d}
                      className="text-right py-1.5 px-3 text-muted-foreground font-normal"
                    >
                      {DIFF_LABELS[d]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PREVIEW_DISTANCES.map((distM) => {
                  const scores = difficulties.map((d) =>
                    calcScore(
                      distM,
                      draft[scaleKeys[d]] as number,
                      draft[multKeys[d]] as number,
                      draft.maxBaseScore,
                      draft.maxDistanceM,
                    ),
                  );
                  const isMax = distM >= draft.maxDistanceM;
                  return (
                    <tr key={distM} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5 pr-4 font-mono">
                        {distM >= 1000 ? `${(distM / 1000).toFixed(distM % 1000 === 0 ? 0 : 1)} km` : `${distM} m`}
                        {isMax && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">(cutoff)</span>
                        )}
                      </td>
                      {scores.map((s, i) => (
                        <td
                          key={i}
                          className={`text-right py-1.5 px-3 font-mono tabular-nums ${
                            s === 0 ? "text-muted-foreground" :
                            s >= draft.maxBaseScore * 0.7 ? "text-success" :
                            s >= draft.maxBaseScore * 0.3 ? "text-warning" : "text-destructive"
                          }`}
                        >
                          {s.toLocaleString("pl-PL")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Maks. wynik z bonusem: {(draft.maxBaseScore * Math.max(draft.multEasy, draft.multMedium, draft.multHard) + draft.maxTimeBonus).toLocaleString("pl-PL")} pkt
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  isFloat,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  step: number;
  isFloat?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground leading-snug">{hint}</p>}
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={isFloat ? value : value}
        onChange={onChange}
        className="font-mono"
      />
    </div>
  );
}
