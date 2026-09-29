"use client";

import { useEffect, useState } from "react";

type ConfirmationResult =
  | { status: "checking" | "confirmed" | "unknown" }
  | { status: "error"; detail: string };

export default function EmailConfirmedPage() {
  const [result, setResult] = useState<ConfirmationResult>({ status: "checking" });
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    const error = fragment.get("error") || url.searchParams.get("error");
    const errorDescription = fragment.get("error_description") || url.searchParams.get("error_description");

    if (error || errorDescription) {
      setResult({
        status: "error",
        detail: errorDescription || "This confirmation link may have expired or already been used. Register again or ask a custodian for help."
      });
    } else if (fragment.has("access_token") || url.searchParams.has("code")) {
      setResult({ status: "confirmed" });
    } else {
      setResult({ status: "unknown" });
    }

    if (url.hash || url.searchParams.has("code")) {
      url.searchParams.delete("code");
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    }
  }, []);

  const hasError = result.status === "error";
  const isConfirmed = result.status === "confirmed";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10" aria-labelledby="confirmation-title">
        <div className={`mb-6 flex size-14 items-center justify-center rounded-2xl text-2xl font-semibold ${hasError ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`} aria-hidden="true">
          {hasError ? "!" : isConfirmed ? "✓" : "·"}
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">LABTRACK · Account confirmation</p>
        <h1 id="confirmation-title" className="text-3xl font-semibold tracking-tight">
          {hasError ? "We couldn’t confirm your email" : isConfirmed ? "Your email is confirmed" : result.status === "checking" ? "Checking confirmation…" : "Open your confirmation email"}
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          {hasError
            ? result.detail
            : isConfirmed
              ? "Your LABTRACK account is ready. Sign in to the Student/Faculty Android app with the email address and password you registered."
              : result.status === "checking"
                ? "Please wait while we check your confirmation link."
                : "Use the link in your latest confirmation email. If you have already confirmed your address, open the Student/Faculty Android app to sign in."}
        </p>
        {isConfirmed && isAndroid ? (
          <a
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            href="labtrack:///sign-in"
          >
            Open Student/Faculty sign in
          </a>
        ) : null}
      </section>
    </main>
  );
}
