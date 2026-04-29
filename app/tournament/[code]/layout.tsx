import type { Metadata } from "next";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeTournamentCode } from "@/lib/tournaments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = normalizeTournamentCode(rawCode);

  const [tournament] = await db
    .select({
      code: tournaments.code,
      filterDifficulty: tournaments.filterDifficulty,
      status: tournaments.status,
    })
    .from(tournaments)
    .where(eq(tournaments.code, code))
    .limit(1);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!tournament) {
    return {
      title: "Turniej — Panopin",
      description: "Zgaduj lokalizacje panoram 360° razem ze znajomymi.",
    };
  }

  const difficultyPl =
    tournament.filterDifficulty === "easy"
      ? "łatwe"
      : tournament.filterDifficulty === "medium"
        ? "średnie"
        : tournament.filterDifficulty === "hard"
          ? "trudne"
          : null;

  const difficultyNote = difficultyPl ? ` (${difficultyPl})` : "";
  const statusNote =
    tournament.status === "finished"
      ? "Wyniki turnieju"
      : tournament.status === "playing"
        ? "Turniej w toku"
        : "Dołącz do turnieju";

  const title = `${statusNote} · ${tournament.code} — Panopin`;
  const description =
    tournament.status === "lobby"
      ? `Zagraj ze mną w Panopin! Dołącz do turnieju ${tournament.code}${difficultyNote} — kto lepiej zgadnie lokalizacje panoram 360°?`
      : `Turniej Panopin ${tournament.code}${difficultyNote} — zgadywanie lokalizacji panoram 360°.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/tournament/${code}`,
      siteName: "Panopin",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function TournamentCodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
