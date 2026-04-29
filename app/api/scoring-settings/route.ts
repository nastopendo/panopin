import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { scoringSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_SCORING_CONFIG } from "@/lib/scoring";

export async function GET() {
  const [row] = await db
    .select({
      timeLimitS: scoringSettings.timeLimitS,
      maxBaseScore: scoringSettings.maxBaseScore,
      maxTimeBonus: scoringSettings.maxTimeBonus,
      maxDistanceM: scoringSettings.maxDistanceM,
    })
    .from(scoringSettings)
    .where(eq(scoringSettings.id, 1))
    .limit(1);

  if (!row) {
    return NextResponse.json({
      timeLimitS: DEFAULT_SCORING_CONFIG.timeLimitMs / 1000,
      maxBaseScore: DEFAULT_SCORING_CONFIG.maxBaseScore,
      maxTimeBonus: DEFAULT_SCORING_CONFIG.maxTimeBonus,
      maxDistanceM: DEFAULT_SCORING_CONFIG.maxDistanceM,
    });
  }

  return NextResponse.json(row);
}
