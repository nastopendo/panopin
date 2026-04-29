import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { tournamentPlayers, tournaments } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/server";
import {
  TOURNAMENT_DISPLAY_NAME_MAX,
  TOURNAMENT_DISPLAY_NAME_MIN,
  generateTournamentCode,
} from "@/lib/tournaments";

const BodySchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(TOURNAMENT_DISPLAY_NAME_MIN)
    .max(TOURNAMENT_DISPLAY_NAME_MAX),
  filterDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
  filterTagIds: z.array(z.string().uuid()).optional(),
});

const MAX_CODE_RETRIES = 5;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { displayName, filterDifficulty, filterTagIds } = parsed.data;

  let tournamentId: string | null = null;
  let code: string | null = null;

  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const candidate = generateTournamentCode();
    try {
      const [row] = await db
        .insert(tournaments)
        .values({
          code: candidate,
          hostId: user.id,
          filterDifficulty: filterDifficulty ?? null,
          filterTagIds: filterTagIds ?? null,
        })
        .returning({ id: tournaments.id, code: tournaments.code });
      tournamentId = row.id;
      code = row.code;
      break;
    } catch (err) {
      // Unique violation on code → retry
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("tournaments_code_unique")) throw err;
    }
  }

  if (!tournamentId || !code) {
    return NextResponse.json(
      { error: "could not generate unique tournament code" },
      { status: 500 },
    );
  }

  await db.insert(tournamentPlayers).values({
    tournamentId,
    userId: user.id,
    displayName,
    isHost: true,
  });

  return NextResponse.json({ code, tournamentId });
}
