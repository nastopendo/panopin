import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { tournamentPlayers, tournaments } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import {
  generateTournamentCode,
  isValidTournamentCode,
  normalizeTournamentCode,
} from "@/lib/tournaments";

const VALID_DIFFICULTIES = ["easy", "medium", "hard", "extreme"] as const;

const BodySchema = z.object({
  filterDifficulties: z
    .array(z.enum(VALID_DIFFICULTIES))
    .min(1, "Wybierz co najmniej jedną trudność")
    .optional(),
});

const MAX_CODE_RETRIES = 5;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { code: rawCode } = await params;
  const code = normalizeTournamentCode(rawCode);
  if (!isValidTournamentCode(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { filterDifficulties } = parsed.data;

  const [oldTournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.code, code))
    .limit(1);

  if (!oldTournament) {
    return NextResponse.json({ error: "tournament not found" }, { status: 404 });
  }

  if (oldTournament.hostId !== user.id) {
    return NextResponse.json({ error: "only host can create rematch" }, { status: 403 });
  }

  if (oldTournament.status !== "finished") {
    return NextResponse.json(
      { error: "tournament must be finished to create a rematch" },
      { status: 409 },
    );
  }

  // Idempotent — if rematch already created, return existing code
  if (oldTournament.nextTournamentCode) {
    return NextResponse.json({
      code: oldTournament.nextTournamentCode,
      alreadyCreated: true,
    });
  }

  // All players must have finished — block if anyone did not finish
  const [unfinished] = await db
    .select({ id: tournamentPlayers.id })
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.tournamentId, oldTournament.id),
        isNull(tournamentPlayers.finishedAt),
      ),
    )
    .limit(1);

  if (unfinished) {
    return NextResponse.json(
      { error: "all players must finish before creating a rematch" },
      { status: 409 },
    );
  }

  const previousPlayers = await db
    .select({
      userId: tournamentPlayers.userId,
      displayName: tournamentPlayers.displayName,
      isHost: tournamentPlayers.isHost,
    })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, oldTournament.id))
    .orderBy(asc(tournamentPlayers.joinedAt));

  if (previousPlayers.length === 0) {
    return NextResponse.json(
      { error: "no players to carry over" },
      { status: 422 },
    );
  }

  const newDifficulties =
    filterDifficulties ?? (oldTournament.filterDifficulties as string[] | null) ?? null;
  const newTagIds = (oldTournament.filterTagIds as string[] | null) ?? null;

  let newTournamentId: string | null = null;
  let newCode: string | null = null;

  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const candidate = generateTournamentCode();
    try {
      const result = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(tournaments)
          .values({
            code: candidate,
            hostId: oldTournament.hostId,
            filterDifficulties: newDifficulties,
            filterTagIds: newTagIds,
          })
          .returning({ id: tournaments.id, code: tournaments.code });

        await tx.insert(tournamentPlayers).values(
          previousPlayers.map((p) => ({
            tournamentId: created.id,
            userId: p.userId,
            displayName: p.displayName,
            isHost: p.isHost,
          })),
        );

        await tx
          .update(tournaments)
          .set({ nextTournamentCode: created.code })
          .where(eq(tournaments.id, oldTournament.id));

        return created;
      });
      newTournamentId = result.id;
      newCode = result.code;
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("tournaments_code_unique")) throw err;
    }
  }

  if (!newTournamentId || !newCode) {
    return NextResponse.json(
      { error: "could not generate unique tournament code" },
      { status: 500 },
    );
  }

  return NextResponse.json({ code: newCode, tournamentId: newTournamentId });
}
