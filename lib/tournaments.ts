// Avoids confusable characters: 0/O, 1/I/L
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export const TOURNAMENT_PLAYER_LIMIT = 20;
export const TOURNAMENT_PHOTOS_PER_GAME = 5;
export const TOURNAMENT_DISPLAY_NAME_MIN = 2;
export const TOURNAMENT_DISPLAY_NAME_MAX = 30;

export function generateTournamentCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeTournamentCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidTournamentCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}
