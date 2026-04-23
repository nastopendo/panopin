import { createSupabaseBrowserClient } from "./client";

const ANON_SESSION_COOKIE = "panopin_anon_session";

export async function ensureGuestSession(): Promise<string> {
  const supabase = createSupabaseBrowserClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) throw new Error("Failed to create anonymous session");

  return data.session.user.id;
}

export function getAnonSessionId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`${ANON_SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}
