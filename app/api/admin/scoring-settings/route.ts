import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { scoringSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring";

const DEFAULTS = {
  maxDistanceM: DEFAULT_SCORING_CONFIG.maxDistanceM,
  timeLimitS: DEFAULT_SCORING_CONFIG.timeLimitMs / 1000,
  maxBaseScore: DEFAULT_SCORING_CONFIG.maxBaseScore,
  maxTimeBonus: DEFAULT_SCORING_CONFIG.maxTimeBonus,
  scaleEasyM: DEFAULT_SCORING_CONFIG.scaleM.easy,
  scaleMediumM: DEFAULT_SCORING_CONFIG.scaleM.medium,
  scaleHardM: DEFAULT_SCORING_CONFIG.scaleM.hard,
  multEasy: DEFAULT_SCORING_CONFIG.mult.easy,
  multMedium: DEFAULT_SCORING_CONFIG.mult.medium,
  multHard: DEFAULT_SCORING_CONFIG.mult.hard,
  minSpacingM: 0,
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [row] = await db
    .select()
    .from(scoringSettings)
    .where(eq(scoringSettings.id, 1))
    .limit(1);

  return NextResponse.json(row ?? DEFAULTS);
}

const BodySchema = z.object({
  maxDistanceM: z.number().int().min(100).max(100_000),
  timeLimitS: z.number().int().min(0).max(300),
  maxBaseScore: z.number().int().min(100).max(10_000),
  maxTimeBonus: z.number().int().min(0).max(1000),
  scaleEasyM: z.number().int().min(10).max(50_000),
  scaleMediumM: z.number().int().min(10).max(50_000),
  scaleHardM: z.number().int().min(10).max(50_000),
  multEasy: z.number().min(0.1).max(5),
  multMedium: z.number().min(0.1).max(5),
  multHard: z.number().min(0.1).max(5),
  minSpacingM: z.number().int().min(0).max(20_000),
});

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const json = await req.json();
  const parse = BodySchema.safeParse(json);
  if (!parse.success) {
    return NextResponse.json({ error: "invalid body", details: parse.error }, { status: 400 });
  }

  const data = parse.data;

  await db
    .insert(scoringSettings)
    .values({ id: 1, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: scoringSettings.id,
      set: { ...data, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
