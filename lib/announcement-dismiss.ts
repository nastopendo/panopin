const STORAGE_KEY = "panopin-announcement-dismissed-at";

/**
 * Returns true if the user has dismissed the announcement at or after `updatedAt`.
 * Safe to call on the server — returns false when window is undefined.
 */
export function isAnnouncementDismissed(updatedAtIso: string): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  return new Date(stored).getTime() >= new Date(updatedAtIso).getTime();
}

export function dismissAnnouncement(updatedAtIso: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, updatedAtIso);
}
