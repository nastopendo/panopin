"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/auth/client";

type AuthorizationDetails = {
  client: {
    name: string;
  };
  redirect_uri: string;
  scope: string | null;
};

export default function OAuthConsentPage() {
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
        setError("Brak authorization_id w URL.");
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
        setError(authError?.message ?? "Nieprawidlowe zadanie autoryzacji.");
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
      setError(
        decisionError?.message ?? "Nie udalo sie zakonczyc autoryzacji.",
      );
      setSubmitting(null);
      return;
    }

    window.location.href = data.redirect_url;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">OAuth consent</h1>
          <p className="text-sm text-zinc-500">
            Potwierdz dostep aplikacji zewnetrznej do Twojego konta.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">
            Ladowanie szczegolow autoryzacji...
          </p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : details ? (
          <>
            <div className="rounded-xl border border-zinc-200 p-4 text-sm space-y-2">
              <p>
                <span className="font-medium">Client:</span>{" "}
                {details.client.name}
              </p>
              <p className="break-all">
                <span className="font-medium">Redirect URI:</span>{" "}
                {details.redirect_uri}
              </p>
            </div>

            {scopeList.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Requested permissions:</p>
                <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
                  {scopeList.map((scope) => (
                    <li key={scope}>{scope}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleDecision("deny")}
                disabled={submitting !== null}
                className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50"
              >
                {submitting === "deny" ? "Odrzucanie..." : "Deny"}
              </button>
              <button
                type="button"
                onClick={() => handleDecision("approve")}
                disabled={submitting !== null}
                className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {submitting === "approve" ? "Zatwierdzanie..." : "Approve"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
