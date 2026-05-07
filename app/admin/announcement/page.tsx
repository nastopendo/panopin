"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Form {
  title: string;
  body: string;
  imageUrl: string | null;
  ctaText: string;
  ctaUrl: string;
  visible: boolean;
  showOnHome: boolean;
  showOnLeaderboard: boolean;
  showAsPopup: boolean;
}

const EMPTY: Form = {
  title: "",
  body: "",
  imageUrl: null,
  ctaText: "",
  ctaUrl: "",
  visible: false,
  showOnHome: true,
  showOnLeaderboard: true,
  showAsPopup: false,
};

interface ApiRow {
  title: string;
  body: string;
  imageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  visible: boolean;
  showOnHome: boolean;
  showOnLeaderboard: boolean;
  showAsPopup: boolean;
}

function fromApi(row: ApiRow): Form {
  return {
    title: row.title,
    body: row.body,
    imageUrl: row.imageUrl,
    ctaText: row.ctaText ?? "",
    ctaUrl: row.ctaUrl ?? "",
    visible: row.visible,
    showOnHome: row.showOnHome,
    showOnLeaderboard: row.showOnLeaderboard,
    showAsPopup: row.showAsPopup,
  };
}

export default function AnnouncementPage() {
  const [form, setForm] = useState<Form | null>(null);
  const originalRef = useRef<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((row) => {
        const f = row ? fromApi(row) : EMPTY;
        setForm(f);
        originalRef.current = f;
      })
      .catch(() => setError("Nie można wczytać ogłoszenia"));
  }, []);

  if (!form) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Ogłoszenie</h1>
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

  const dirty = JSON.stringify(form) !== JSON.stringify(originalRef.current);

  async function handleSave() {
    if (!form || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        imageUrl: form.imageUrl,
        ctaText: form.ctaText.trim() || null,
        ctaUrl: form.ctaUrl.trim() || null,
        visible: form.visible,
        showOnHome: form.showOnHome,
        showOnLeaderboard: form.showOnLeaderboard,
        showAsPopup: form.showAsPopup,
      };
      const res = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      originalRef.current = form;
      toast.success("Ogłoszenie zapisane");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ogłoszenie</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Banner widoczny na stronie głównej i rankingu.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Widoczność</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="visible">Pokazuj ogłoszenie</Label>
              <p className="text-xs text-muted-foreground">
                Wyłączone = ukryte wszędzie, niezależnie od poniższych ustawień.
              </p>
            </div>
            <Switch
              id="visible"
              checked={form.visible}
              onCheckedChange={(v) => setForm((f) => f && { ...f, visible: v })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gdzie wyświetlać</CardTitle>
          <p className="text-sm text-muted-foreground">
            Wybierz miejsca, w których ogłoszenie ma się pojawić. Gracze mogą zamknąć
            ogłoszenie — wróci, gdy zaktualizujesz treść.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <PlacementToggle
            id="showOnHome"
            label="Strona główna"
            description={"Banner pomiędzy hero a sekcją „Jak to działa”."}
            checked={form.showOnHome}
            disabled={!form.visible}
            onChange={(v) => setForm((f) => f && { ...f, showOnHome: v })}
          />
          <PlacementToggle
            id="showOnLeaderboard"
            label="Strona rankingu"
            description="Banner nad listą najlepszych wyników."
            checked={form.showOnLeaderboard}
            disabled={!form.visible}
            onChange={(v) => setForm((f) => f && { ...f, showOnLeaderboard: v })}
          />
          <PlacementToggle
            id="showAsPopup"
            label="Pop-up po wejściu na stronę"
            description="Modal wyświetlany raz — wraca dopiero po edycji ogłoszenia."
            checked={form.showAsPopup}
            disabled={!form.visible}
            onChange={(v) => setForm((f) => f && { ...f, showAsPopup: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Treść</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Tytuł</Label>
            <Input
              id="title"
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => f && { ...f, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Treść</Label>
            <RichTextEditor
              value={form.body}
              onChange={(html) => setForm((f) => f && { ...f, body: html })}
            />
            <p className="text-xs text-muted-foreground">
              Użyj paska narzędzi: pogrubienie, kursywa, listy, nagłówki, linki.
              Enter = nowy akapit, Shift+Enter = nowa linia.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Obraz</CardTitle>
        </CardHeader>
        <CardContent>
          <ImagePicker
            value={form.imageUrl}
            onChange={(url) => setForm((f) => f && { ...f, imageUrl: url })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Przycisk akcji (opcjonalnie)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ctaText">Tekst przycisku</Label>
            <Input
              id="ctaText"
              maxLength={60}
              placeholder="np. Zobacz regulamin"
              value={form.ctaText}
              onChange={(e) => setForm((f) => f && { ...f, ctaText: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctaUrl">URL przycisku</Label>
            <Input
              id="ctaUrl"
              type="url"
              placeholder="https://…"
              value={form.ctaUrl}
              onChange={(e) => setForm((f) => f && { ...f, ctaUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Oba pola muszą być wypełnione, żeby przycisk się wyświetlił.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlacementToggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className={disabled ? "text-muted-foreground" : ""}>
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}
