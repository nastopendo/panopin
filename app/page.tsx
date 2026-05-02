import Link from "next/link";
import { count, eq, isNotNull } from "drizzle-orm";
import {
  ArrowRight,
  Compass,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { db } from "@/lib/db/client";
import { photos, rounds } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { UserNav } from "@/components/UserNav";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

async function loadStats() {
  try {
    const [photoRow, roundRow] = await Promise.all([
      db
        .select({ value: count() })
        .from(photos)
        .where(eq(photos.status, "published")),
      db
        .select({ value: count() })
        .from(rounds)
        .where(isNotNull(rounds.totalScore)),
    ]);
    return {
      panoramas: photoRow[0]?.value ?? 0,
      rounds: roundRow[0]?.value ?? 0,
    };
  } catch {
    return null;
  }
}

const STEPS = [
  {
    icon: MapPin,
    title: "Obejrzyj panoramę",
    desc: "Otwórz zdjęcie 360° i rozejrzyj się — szukaj znajomych ulic, budynków i innych charakterystycznych elementów.",
  },
  {
    icon: Compass,
    title: "Postaw pinezkę",
    desc: "Wybierz na mapie miejsce, w którym Twoim zdaniem powstała panorama. Im bliżej trafisz — tym więcej punktów.",
  },
  {
    icon: Trophy,
    title: "Pobij rekord",
    desc: "5 lokalizacji, jeden łączny wynik. Walcz o miejsce w rankingu albo udostępnij wynik znajomym i sprawdź, kto trafia celniej.",
  },
];

export default async function HomePage() {
  const stats = await loadStats();

  return (
    <main className="bg-aurora min-h-dvh flex flex-col">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Logo size="md" />
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/leaderboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            <Trophy className="size-4" />
            Ranking
          </Link>
          <Link
            href="/leaderboard"
            aria-label="Ranking"
            className="text-muted-foreground hover:text-foreground transition-colors sm:hidden"
          >
            <Trophy className="size-5" />
          </Link>
          <UserNav />
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-8 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur-md mb-6">
          <Sparkles className="size-3.5 text-brand" />
          Otwartoźródłowa gra zrobiona dla lokalnej społeczności
        </span>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl text-balance">
          Zgadnij, gdzie zrobiono{" "}
          <span className="bg-gradient-to-br from-brand via-brand to-brand/60 bg-clip-text text-transparent">
            panoramę 360°
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl text-pretty">
          Obejrzyj zdjęcie z okolicy, postaw pinezkę na mapie i zdobywaj punkty.
          Im bliżej trafisz — tym lepiej. 5 lokalizacji, jedna runda, czysta
          zabawa.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            asChild
            size="xl"
            variant="brand"
            className="w-full sm:w-auto"
          >
            <Link href="/play">
              Zagraj teraz
              <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Link href="/tournament">
              <Users className="size-5" />
              Turniej ze znajomymi
            </Link>
          </Button>
        </div>

        {stats && stats.panoramas > 0 && (
          <dl className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-12 max-w-xl">
            <Stat
              label="Panoram w grze"
              value={stats.panoramas.toLocaleString("pl-PL")}
            />
            <Stat
              label="Rund rozegranych"
              value={stats.rounds.toLocaleString("pl-PL")}
            />
            <Stat
              label="Lokalizacji na rundę"
              value="5"
              className="col-span-2 sm:col-span-1"
            />
          </dl>
        )}
      </section>

      <section className="px-4 sm:px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-10">
            Jak to działa
          </h2>
          <ol className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-2xl border bg-card/50 p-6 backdrop-blur-md"
              >
                <span className="absolute -top-3 left-6 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Krok {i + 1}
                </span>
                <step.icon
                  className="size-7 text-brand mb-4"
                  strokeWidth={1.6}
                />
                <h3 className="text-base font-semibold mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className ?? ""}`}>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
