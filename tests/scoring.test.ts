import { describe, it, expect } from "vitest";
import { scoreGuess } from "@/lib/scoring";

describe("scoreGuess", () => {
  it("perfect guess (0 m) returns max score", () => {
    const result = scoreGuess({
      guessLat: 52.2297,
      guessLng: 21.0122,
      actualLat: 52.2297,
      actualLng: 21.0122,
      difficulty: "medium",
      elapsedMs: 0,
    });
    expect(result.distanceM).toBe(0);
    expect(result.total).toBeGreaterThanOrEqual(6000); // 5000 * 1.2 + 300
  });

  it("hard difficulty multiplies score", () => {
    const medium = scoreGuess({
      guessLat: 52.2297, guessLng: 21.0122,
      actualLat: 52.2297, actualLng: 21.0122,
      difficulty: "medium", elapsedMs: 60_000,
    });
    const hard = scoreGuess({
      guessLat: 52.2297, guessLng: 21.0122,
      actualLat: 52.2297, actualLng: 21.0122,
      difficulty: "hard", elapsedMs: 60_000,
    });
    expect(hard.total).toBeGreaterThan(medium.total);
  });

  it("1000 km distance scores near 0 on hard", () => {
    const result = scoreGuess({
      guessLat: 52.2297, guessLng: 21.0122,
      actualLat: 43.2965, actualLng: -5.7002, // ~2700 km
      difficulty: "hard",
      elapsedMs: 60_000,
    });
    expect(result.total).toBeLessThan(50);
  });

  it("time bonus is capped at MAX_TIME_BONUS", () => {
    const instant = scoreGuess({
      guessLat: 52.2297, guessLng: 21.0122,
      actualLat: 52.2297, actualLng: 21.0122,
      difficulty: "easy", elapsedMs: 0,
    });
    const slow = scoreGuess({
      guessLat: 52.2297, guessLng: 21.0122,
      actualLat: 52.2297, actualLng: 21.0122,
      difficulty: "easy", elapsedMs: 60_000,
    });
    expect(instant.timeBonus).toBe(300);
    expect(slow.timeBonus).toBe(0);
    expect(instant.total - slow.total).toBe(300);
  });
});
