const STORAGE_KEY = "panopin-pano-hint-seen";

/**
 * Returns true if the swipe-to-look-around hint was already shown to this user.
 * Safe on the server and when localStorage is blocked — returns true so the
 * one-time hint is never nagged when we cannot persist that it was seen.
 */
export function isPanoHintSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markPanoHintSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode / storage disabled — ignore, hint just won't repeat-guard */
  }
}
