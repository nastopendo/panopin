"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell loading />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginShell({
  loading,
  children,
}: {
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <main className="bg-aurora min-h-screen flex flex-col">
      <header className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo size="md" />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft />
            <span className="hidden sm:inline">Strona główna</span>
          </Link>
        </Button>
      </header>
      <section className="flex-1 flex items-center justify-center px-4 py-10">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Wczytywanie…
          </div>
        ) : (
          children
        )}
      </section>
    </main>
  );
}

function LoginInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<"google" | "magic" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();
  const redirectAfterAuth = searchParams.get("redirect");
  const getAuthCallbackUrl = () => {
    const authCallbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectAfterAuth) {
      authCallbackUrl.searchParams.set("next", redirectAfterAuth);
    }
    return authCallbackUrl.toString();
  };

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading("magic");
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getAuthCallbackUrl() },
    });

    setLoading(null);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  async function handleGoogle() {
    setLoading("google");
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user.is_anonymous) {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: getAuthCallbackUrl() },
      });
      if (error) {
        setError(error.message);
        setLoading(null);
      }
    } else {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthCallbackUrl() },
      });
    }
  }

  return (
    <LoginShell>
      {sent ? (
        <Card className="w-full max-w-sm bg-card/60 backdrop-blur-md text-center">
            <CardContent className="p-8 space-y-3">
              <div className="size-12 rounded-full bg-success/15 ring-1 ring-success/30 flex items-center justify-center mx-auto">
                <MailCheck className="size-6 text-success" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">Sprawdź skrzynkę</h2>
              <p className="text-muted-foreground text-sm">
                Wysłaliśmy link logowania na <strong className="text-foreground">{email}</strong>.
                Kliknij go aby się zalogować.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors pt-2"
              >
                Zmień adres e-mail
              </button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-sm bg-card/60 backdrop-blur-md">
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Witaj z powrotem</h1>
                <p className="text-muted-foreground text-sm">
                  Zaloguj się aby zachować postępy i wyniki.
                </p>
              </div>

              <Button
                onClick={handleGoogle}
                disabled={loading !== null}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {loading === "google" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                    <path
                      fill="#4285F4"
                      d="M47.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.5 7.3-17.2z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.7 42.8 14.8 48 24 48z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.8 28.8c-.5-1.4-.7-2.8-.7-4.3s.3-2.9.7-4.3v-6.2H2.7C1 17.4 0 20.6 0 24s1 6.6 2.7 9l8.1-4.2z"
                    />
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.5 30.4 0 24 0 14.8 0 6.7 5.2 2.7 15l8.1 4.2C12.7 13.6 17.9 9.5 24 9.5z"
                    />
                  </svg>
                )}
                Zaloguj przez Google
              </Button>

              <div className="flex items-center gap-3 text-muted-foreground text-xs">
                <div className="flex-1 h-px bg-border" />
                lub link e-mail
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    placeholder="ty@przykład.pl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-destructive text-xs">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={loading !== null}
                  size="lg"
                  className="w-full"
                >
                  {loading === "magic" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Wysyłanie…
                    </>
                  ) : (
                    <>
                      <Mail />
                      Wyślij link logowania
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
    </LoginShell>
  );
}
