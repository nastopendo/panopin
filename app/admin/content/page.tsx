"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ContentEntry {
  key: string;
  value: string;
  defaultValue: string;
  isDefault: boolean;
  meta: { section: string; label: string; description?: string; multiline?: boolean };
}

type Draft = Record<string, string>;

export default function ContentPage() {
  const [entries, setEntries] = useState<ContentEntry[] | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const originalRef = useRef<Draft>({});

  useEffect(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((data: ContentEntry[]) => {
        setEntries(data);
        const values = Object.fromEntries(data.map((e) => [e.key, e.value]));
        setDraft(values);
        originalRef.current = values;
      })
      .catch(() => setError("Nie można wczytać treści"));
  }, []);

  const dirtyKeys = entries
    ? entries.filter((e) => draft[e.key] !== originalRef.current[e.key]).map((e) => e.key)
    : [];

  const dirty = dirtyKeys.length > 0;

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      const payload = dirtyKeys.map((key) => ({ key, value: draft[key] }));
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      originalRef.current = { ...draft };
      setEntries((prev) =>
        prev
          ? prev.map((e) => ({
              ...e,
              value: draft[e.key],
              isDefault: draft[e.key] === e.defaultValue,
            }))
          : prev,
      );
      toast.success(`Zapisano ${payload.length} ${payload.length === 1 ? "tekst" : "tekstów"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(key: string, defaultValue: string) {
    setResetting(key);
    try {
      const res = await fetch("/api/admin/content", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDraft((d) => ({ ...d, [key]: defaultValue }));
      originalRef.current = { ...originalRef.current, [key]: defaultValue };
      setEntries((prev) =>
        prev ? prev.map((e) => (e.key === key ? { ...e, value: defaultValue, isDefault: true } : e)) : prev,
      );
      toast.success("Przywrócono domyślny tekst");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd resetowania");
    } finally {
      setResetting(null);
    }
  }

  if (!entries) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Treści strony</h1>
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

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.key.includes(search.toLowerCase()) ||
          e.meta.label.toLowerCase().includes(search.toLowerCase()) ||
          e.value.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const sections = [...new Set(filtered.map((e) => e.meta.section))];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Treści strony</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Nadpisz domyślne teksty — puste pole = wartość domyślna.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} variant="brand">
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Zapisuję…
            </>
          ) : (
            `Zapisz${dirty ? ` (${dirtyKeys.length})` : ""}`
          )}
        </Button>
      </header>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po nazwie lub treści…"
          className="pl-9"
        />
      </div>

      {sections.map((section) => {
        const sectionEntries = filtered.filter((e) => e.meta.section === section);
        return (
          <Card key={section}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {sectionEntries.map((entry) => {
                const isDirty = draft[entry.key] !== originalRef.current[entry.key];
                const isOverridden = draft[entry.key] !== entry.defaultValue;
                return (
                  <div key={entry.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Label htmlFor={entry.key} className="text-sm font-medium">
                          {entry.meta.label}
                        </Label>
                        {isDirty && (
                          <Badge variant="outline" className="text-[10px] text-warning border-warning/40 shrink-0">
                            zmienione
                          </Badge>
                        )}
                        {!isDirty && isOverridden && (
                          <Badge variant="outline" className="text-[10px] text-brand border-brand/40 shrink-0">
                            nadpisane
                          </Badge>
                        )}
                      </div>
                      {isOverridden && !isDirty && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground gap-1 shrink-0"
                          onClick={() => handleReset(entry.key, entry.defaultValue)}
                          disabled={resetting === entry.key}
                        >
                          {resetting === entry.key ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                          Przywróć domyślny
                        </Button>
                      )}
                    </div>
                    {entry.meta.description && (
                      <p className="text-[11px] text-muted-foreground">{entry.meta.description}</p>
                    )}
                    {entry.meta.multiline ? (
                      <Textarea
                        id={entry.key}
                        value={draft[entry.key] ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [entry.key]: e.target.value }))}
                        rows={3}
                        className={isDirty ? "border-warning/60 focus-visible:ring-warning/30" : ""}
                      />
                    ) : (
                      <Input
                        id={entry.key}
                        value={draft[entry.key] ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [entry.key]: e.target.value }))}
                        className={isDirty ? "border-warning/60 focus-visible:ring-warning/30" : ""}
                      />
                    )}
                    {isDirty && (
                      <p className="text-[10px] text-muted-foreground">
                        Domyślnie: <span className="italic">{entry.defaultValue}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 font-mono">{entry.key}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Brak wyników dla &ldquo;{search}&rdquo;</p>
      )}
    </div>
  );
}
