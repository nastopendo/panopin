"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";

export default function SetupPage() {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Nick musi mieć od 2 do 30 znaków");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: trimmed }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error ?? "Błąd zapisu");
    }
  }

  return (
    <main className="bg-aurora min-h-dvh flex flex-col">
      <header className="px-4 sm:px-6 py-4">
        <Logo size="md" />
      </header>

      <section className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-sm bg-card/60 backdrop-blur-md">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-1">
              <div className="size-12 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mx-auto mb-4">
                <UserCircle className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Jak mamy Cię nazywać?
              </h1>
              <p className="text-muted-foreground text-sm">
                Nick pojawi się w rankingu i wynikach gier. Możesz to zmienić
                później.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="nick"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Twój nick
                </Label>
                <Input
                  id="nick"
                  ref={inputRef}
                  autoFocus
                  autoComplete="nickname"
                  placeholder="np. Malinowy_Odkrywca"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  maxLength={30}
                />
                {error ? (
                  <p role="alert" className="text-destructive text-xs">
                    {error}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {value.trim().length}/30 znaków
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={saving}
                size="lg"
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Zapisuję…
                  </>
                ) : (
                  <>
                    <ArrowRight />
                    Zapisz i zagraj
                  </>
                )}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
              >
                Pomiń na razie
              </button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
