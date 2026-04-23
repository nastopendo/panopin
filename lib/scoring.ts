import type { Difficulty } from "@/lib/db/schema";
import { haversineMeters } from "@/lib/geo";

// km scale for exponential decay — smaller = harder to earn points at distance
const SCALE_M: Record<Difficulty, number> = {
  easy: 2000,
  medium: 1000,
  hard: 500,
};

// score multiplier per difficulty
const MULT: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.5,
};

const MAX_BASE_SCORE = 5000;
const MAX_TIME_BONUS = 300; // points
const TIME_WINDOW_MS = 30_000; // 30 seconds for full bonus

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

export function scoreGuess(input: ScoreInput): ScoreResult {
  const { guessLat, guessLng, actualLat, actualLng, difficulty, elapsedMs } = input;

  const distanceM = Math.round(
    haversineMeters(guessLat, guessLng, actualLat, actualLng),
  );

  const base = MAX_BASE_SCORE * Math.exp(-distanceM / SCALE_M[difficulty]);
  const timeBonus = Math.min(
    MAX_TIME_BONUS,
    Math.max(0, ((TIME_WINDOW_MS - elapsedMs) / TIME_WINDOW_MS) * MAX_TIME_BONUS),
  );

  const total = Math.round(base * MULT[difficulty] + timeBonus);

  return {
    distanceM,
    baseScore: Math.round(base),
    timeBonus: Math.round(timeBonus),
    total,
  };
}
