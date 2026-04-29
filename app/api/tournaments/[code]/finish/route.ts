import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import { isValidTournamentCode, normalizeTournamentCode } from "@/lib/tournaments";

export async function POST(
  _req: Request,
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

  const [tournament] = await db
    .select({
      id: tournaments.id,
      hostId: tournaments.hostId,
      status: tournaments.status,
    })
    .from(tournaments)
    .where(eq(tournaments.code, code))
    .limit(1);

  if (!tournament) {
    return NextResponse.json({ error: "tournament not found" }, { status: 404 });
  }

  if (tournament.hostId !== user.id) {
    return NextResponse.json({ error: "only host can finish" }, { status: 403 });
  }

  if (tournament.status === "finished") {
    return NextResponse.json({ ok: true, alreadyFinished: true });
  }

  await db
    .update(tournaments)
    .set({ status: "finished", finishedAt: new Date() })
    .where(eq(tournaments.id, tournament.id));

  return NextResponse.json({ ok: true });
}
