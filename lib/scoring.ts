import type { Difficulty } from "@/lib/db/schema";
import { haversineMeters } from "@/lib/geo";

export interface ScoringConfig {
  maxDistanceM: number;
  timeLimitMs: number;
  maxBaseScore: number;
  maxTimeBonus: number;
  scaleM: Record<Difficulty, number>;
  mult: Record<Difficulty, number>;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  maxDistanceM: 3000,
  timeLimitMs: 30_000,
  maxBaseScore: 5000,
  maxTimeBonus: 300,
  scaleM: { easy: 800, medium: 500, hard: 300, extreme: 100 },
  mult: { easy: 1.0, medium: 1.2, hard: 1.5, extreme: 2.0 },
};

export interface ScoreInput {
  guessLat: number;
  guessLng: number;
  actualLat: number;
  actualLng: number;
  difficulty: Difficulty;
  elapsedMs: number;
}

export interface ScoreResult {
  distanceM: number;
  baseScore: number;
  timeBonus: number;
  total: number;
}

export function scoreGuess(
  input: ScoreInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoreResult {
  const { guessLat, guessLng, actualLat, actualLng, difficulty, elapsedMs } = input;
  const { maxDistanceM, timeLimitMs, maxBaseScore, maxTimeBonus, scaleM, mult } = config;

  const distanceM = Math.round(
    haversineMeters(guessLat, guessLng, actualLat, actualLng),
  );

  const base =
    distanceM >= maxDistanceM
      ? 0
      : maxBaseScore * Math.exp(-distanceM / scaleM[difficulty]);

  const timeBonus = Math.min(
    maxTimeBonus,
    Math.max(0, ((timeLimitMs - elapsedMs) / timeLimitMs) * maxTimeBonus),
  );

  const total = Math.round(base * mult[difficulty] + timeBonus);

  return {
    distanceM,
    baseScore: Math.round(base),
    timeBonus: Math.round(timeBonus),
    total,
  };
}
