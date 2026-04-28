"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";

type AuthorizationDetails = {
  client: { name: string };
  redirect_uri: string;
  scope: string | null;
};

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<ConsentShell loading />}>
      <ConsentInner />
    </Suspense>
  );
}

function ConsentShell({
  loading,
  children,
}: {
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <main className="bg-aurora min-h-dvh flex flex-col">
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

function ConsentInner() {
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const authorizationId = searchParams.get("authorization_id");
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null);

  const scopeList = details?.scope?.split(" ").filter(Boolean) ?? [];

  useEffect(() => {
    let cancelled = false;

    async function loadAuthorization() {
      if (!authorizationId) {
        setError("Missing authorization_id in the URL.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const currentPath = `/oauth/consent?authorization_id=${encodeURIComponent(
          authorizationId,
        )}`;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        return;
      }

      const { data, error: authError } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

      if (cancelled) return;

      if (authError || !data) {
        setError(authError?.message ?? "Invalid authorization request.");
      } else {
        setDetails(data as AuthorizationDetails);
      }

      setLoading(false);
    }

    void loadAuthorization();

    return () => {
      cancelled = true;
    };
  }, [authorizationId, supabase]);

  async function handleDecision(decision: "approve" | "deny") {
    if (!authorizationId) return;
    setSubmitting(decision);
    setError(null);

    const action =
      decision === "approve"
        ? supabase.auth.oauth.approveAuthorization
        : supabase.auth.oauth.denyAuthorization;

    const { data, error: decisionError } = await action(authorizationId);

    if (decisionError || !data?.redirect_url) {
      setError(decisionError?.message ?? "Failed to complete authorization.");
      setSubmitting(null);
      return;
    }

    window.location.href = data.redirect_url;
  }

  return (
    <ConsentShell>
      <Card className="w-full max-w-lg bg-card/60 backdrop-blur-md">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand/15 ring-1 ring-brand/30 flex items-center justify-center">
              <Shield className="size-5 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Zezwolenie OAuth</h1>
              <p className="text-sm text-muted-foreground">
                Potwierdź dostęp aplikacji zewnętrznej do Twojego konta.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Wczytywanie szczegółów autoryzacji…
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : details ? (
            <>
              <div className="rounded-xl border bg-card/60 p-4 text-sm space-y-2">
                <p>
                  <span className="font-medium text-muted-foreground">Klient:</span>{" "}
                  {details.client.name}
                </p>
                <p className="break-all">
                  <span className="font-medium text-muted-foreground">Redirect URI:</span>{" "}
                  <span className="font-mono text-xs">{details.redirect_uri}</span>
                </p>
              </div>

              {scopeList.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Wymagane uprawnienia:</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {scopeList.map((scope) => (
                      <li key={scope} className="font-mono text-xs">
                        {scope}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDecision("deny")}
                  disabled={submitting !== null}
                  size="lg"
                  className="flex-1"
                >
                  {submitting === "deny" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Odmawiam…
                    </>
                  ) : (
                    "Odmów"
                  )}
                </Button>
                <Button
                  variant="brand"
                  onClick={() => handleDecision("approve")}
                  disabled={submitting !== null}
                  size="lg"
                  className="flex-1"
                >
                  {submitting === "approve" ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Zatwierdzam…
                    </>
                  ) : (
                    "Zatwierdź"
                  )}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </ConsentShell>
  );
}
