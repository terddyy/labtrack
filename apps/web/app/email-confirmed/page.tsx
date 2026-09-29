import Link from "next/link";

type EmailConfirmedPageProps = {
  searchParams: Promise<{ error?: string; error_description?: string }>;
};

export default async function EmailConfirmedPage({ searchParams }: EmailConfirmedPageProps) {
  const params = await searchParams;
  const hasError = Boolean(params.error || params.error_description);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10" aria-labelledby="confirmation-title">
        <div className={`mb-6 flex size-14 items-center justify-center rounded-2xl text-2xl font-semibold ${hasError ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`} aria-hidden="true">
          {hasError ? "!" : "✓"}
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">LABTRACK · Account confirmation</p>
        <h1 id="confirmation-title" className="text-3xl font-semibold tracking-tight">
          {hasError ? "We couldn’t confirm your email" : "Your email is confirmed"}
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          {hasError
            ? params.error_description || "This confirmation link may have expired or already been used. Register again or ask a custodian for help."
            : "Your LABTRACK account is ready. Return to the mobile app and sign in with the email address and password you registered."}
        </p>
        {!hasError ? (
          <a
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            href="labtrack://sign-in"
          >
            Open LABTRACK
          </a>
        ) : (
          <Link className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90" href="/">
            Return to LABTRACK
          </Link>
        )}
      </section>
    </main>
  );
}
