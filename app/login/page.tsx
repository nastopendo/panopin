"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/auth/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user.is_anonymous) {
      // Preserve rounds played as guest by linking Google to the existing anonymous account
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
      if (error) { setError(error.message); setLoading(false); }
    } else {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm text-center space-y-3">
          <div className="text-4xl">📬</div>
          <h2 className="text-lg font-semibold">Sprawdź skrzynkę</h2>
          <p className="text-zinc-500 text-sm">
            Wysłaliśmy link logowania na <strong>{email}</strong>.
            Kliknij go aby się zalogować.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-zinc-400 underline"
          >
            Zmień adres e-mail
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Panopin</h1>
          <p className="text-zinc-500 text-sm">Zaloguj się aby kontynuować</p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 border border-zinc-200 rounded-xl py-2.5 text-sm font-medium hover:bg-zinc-50 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.5 7.3-17.2z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z"/>
            <path fill="#FBBC05" d="M10.8 28.8c-.5-1.4-.7-2.8-.7-4.3s.3-2.9.7-4.3v-6.2H2.7C1 17.4 0 20.6 0 24s1 6.6 2.7 9l8.1-4.2z"/>
            <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.5 30.4 0 24 0 14.8 0 6.7 5.2 2.7 15l8.1 4.2C12.7 13.6 17.9 9.5 24 9.5z"/>
          </svg>
          Zaloguj przez Google
        </button>

        <div className="flex items-center gap-3 text-zinc-300 text-xs">
          <div className="flex-1 h-px bg-zinc-100" />
          lub link na e-mail
          <div className="flex-1 h-px bg-zinc-100" />
        </div>

        {/* Magic link */}
        <form onSubmit={handleMagicLink} className="space-y-3">
          <input
            type="email"
            required
            placeholder="twoj@email.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-zinc-400"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Wysyłanie…" : "Wyślij link logowania"}
          </button>
        </form>
      </div>
    </div>
  );
}
