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
import { photos, rounds, tournaments } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { UserNav } from "@/components/UserNav";
import { Footer } from "@/components/Footer";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { getContent } from "@/lib/content";

export const dynamic = "force-dynamic";

async function loadStats() {
  try {
    const [photoRow, roundRow, tournamentRow] = await Promise.all([
      db
        .select({ value: count() })
        .from(photos)
        .where(eq(photos.status, "published")),
      db
        .select({ value: count() })
        .from(rounds)
        .where(isNotNull(rounds.totalScore)),
      db
        .select({ value: count() })
        .from(tournaments)
        .where(eq(tournaments.status, "finished")),
    ]);
    return {
      panoramas: photoRow[0]?.value ?? 0,
      rounds: roundRow[0]?.value ?? 0,
      tournaments: tournamentRow[0]?.value ?? 0,
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [stats, content] = await Promise.all([loadStats(), getContent()]);

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
          {content["home.badge"]}
        </span>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl text-balance">
          {content["home.hero_title"]}{" "}
          <span className="bg-gradient-to-br from-brand via-brand to-brand/60 bg-clip-text text-transparent">
            {content["home.hero_title_highlight"]}
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl text-pretty">
          {content["home.hero_desc"]}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            asChild
            size="xl"
            variant="brand"
            className="w-full sm:w-auto"
          >
            <Link href="/play">
              {content["home.cta_play"]}
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
              {content["home.cta_tournament"]}
            </Link>
          </Button>
        </div>

        {stats && stats.panoramas > 0 && (
          <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-10 max-w-2xl">
            <Stat
              label={content["home.stat_panoramas"]}
              value={stats.panoramas.toLocaleString("pl-PL")}
            />
            <Stat
              label={content["home.stat_rounds"]}
              value={stats.rounds.toLocaleString("pl-PL")}
            />
            <Stat
              label={content["home.stat_tournaments"]}
              value={stats.tournaments.toLocaleString("pl-PL")}
            />
            <Stat
              label={content["home.stat_per_round"]}
              value="5"
            />
          </dl>
        )}
      </section>

      <AnnouncementBanner placement="home" />
      <AnnouncementPopup />

      <section className="px-4 sm:px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-10">
            {content["home.how_title"]}
          </h2>
          <ol className="grid sm:grid-cols-3 gap-4">
            {(
              [
                { icon: MapPin, titleKey: "home.step1_title", descKey: "home.step1_desc" },
                { icon: Compass, titleKey: "home.step2_title", descKey: "home.step2_desc" },
                { icon: Trophy, titleKey: "home.step3_title", descKey: "home.step3_desc" },
              ] as const
            ).map((step, i) => (
              <li
                key={step.titleKey}
                className="relative rounded-2xl border bg-card/50 p-6 backdrop-blur-md"
              >
                <span className="absolute -top-3 left-6 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Krok {i + 1}
                </span>
                <step.icon
                  className="size-7 text-brand mb-4"
                  strokeWidth={1.6}
                />
                <h3 className="text-base font-semibold mb-1.5">{content[step.titleKey]}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {content[step.descKey]}
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
