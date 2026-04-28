"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-aurora min-h-dvh flex flex-col">
      <header className="px-4 sm:px-6 py-4">
        <Logo size="md" />
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-6">
        <div className="size-16 rounded-2xl bg-destructive/15 ring-1 ring-destructive/30 flex items-center justify-center">
          <AlertTriangle className="size-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Coś poszło nie tak</h1>
          <p className="text-muted-foreground text-sm max-w-xs">
            Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub wróć na stronę główną.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60 font-mono">
              ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <Button variant="brand" size="lg" onClick={reset}>
            <RotateCcw className="size-4" />
            Spróbuj ponownie
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Strona główna
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
