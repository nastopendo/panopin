import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Nie znaleziono" };

export default function NotFound() {
  return (
    <main className="bg-aurora min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 py-4">
        <Logo size="md" />
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-6">
        <div className="size-16 rounded-2xl bg-brand/15 ring-1 ring-brand/30 flex items-center justify-center">
          <MapPin className="size-8 text-brand" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tight tabular-nums">404</h1>
          <p className="text-xl font-semibold tracking-tight">Nie znaleziono strony</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            Ta lokalizacja nie istnieje na naszej mapie. Może wróć na start?
          </p>
        </div>

        <Button asChild variant="brand" size="lg">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Wróć na stronę główną
          </Link>
        </Button>
      </section>
    </main>
  );
}
