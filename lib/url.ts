/**
 * Returns true only for absolute http(s) URLs. Rejects `javascript:`, `data:`,
 * `file:`, etc. Use at trust boundaries (zod refine, link rendering).
 */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
