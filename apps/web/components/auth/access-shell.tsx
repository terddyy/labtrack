"use client";

import { ArrowRight, CalendarCheck2, Loader2, LogOut, QrCode, Wrench, Zap } from "lucide-react";
import type { FormEvent } from "react";
import type { QuickLoginAccount } from "@labtrack/shared";

import { Notice } from "@/components/admin/ui";
import { BrandMark } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminAccessState } from "@/lib/admin/types";

const highlights = [
  { icon: QrCode, title: "QR-tagged register", text: "Every item carries a scannable label and history." },
  { icon: CalendarCheck2, title: "Borrowing workflow", text: "Approve, check out, and return in a few clicks." },
  { icon: Wrench, title: "Defect triage", text: "Route reports from the mobile app to repair." }
];

export function AccessShell({
  access,
  authMessage,
  credentials,
  quickLoginAccounts,
  quickLoginRole,
  onCredentialsChange,
  onQuickSignIn,
  onRetry,
  onSignIn,
  onSignOut
}: {
  access: AdminAccessState;
  authMessage: string | null;
  credentials: { email: string; password: string };
  quickLoginAccounts: QuickLoginAccount[];
  quickLoginRole: string | null;
  onCredentialsChange: (credentials: { email: string; password: string }) => void;
  onQuickSignIn: (account: QuickLoginAccount) => void;
  onRetry: () => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
}) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="absolute inset-0 opacity-60 [--grid-line:oklch(1_0_0/0.05)] bg-blueprint [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_70%)]" />
        <div aria-hidden className="absolute -right-24 -bottom-24 size-96 rounded-full bg-sidebar-primary/25 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <BrandMark className="size-10" />
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight text-sidebar-accent-foreground">LABTRACK</p>
            <p className="text-xs text-sidebar-foreground/60">CCS Asset Operations</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <p className="font-mono text-xs tracking-[0.18em] text-sidebar-primary uppercase">Custodian console</p>
            <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-sidebar-accent-foreground">
              Every device, room, and request — accounted for.
            </h2>
          </div>
          <ul className="space-y-4">
            {highlights.map((item) => (
              <li className="flex items-start gap-3" key={item.title}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-primary">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-sidebar-accent-foreground">{item.title}</p>
                  <p className="text-sm text-sidebar-foreground/60">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-[11px] text-sidebar-foreground/40">Pampanga State University · College of Computing Studies</p>
      </aside>

      <section className="relative flex items-center justify-center px-6 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="animate-rise w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="font-semibold tracking-tight">LABTRACK</span>
          </div>

          {access.status === "checking" ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" />
              Checking admin access…
            </div>
          ) : null}

          {access.status === "missing-config" ? (
            <Notice tone="warning">
              Supabase public configuration is missing. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
            </Notice>
          ) : null}

          {access.status === "error" ? (
            <div className="space-y-3">
              <Notice tone="danger">{access.message}</Notice>
              <Button className="w-full" onClick={onRetry} type="button" variant="outline">
                Retry
              </Button>
            </div>
          ) : null}

          {access.status === "forbidden" ? (
            <div className="space-y-3">
              <Notice tone="danger">{access.profile.fullName} does not have active Custodian access.</Notice>
              <Button className="w-full" onClick={onSignOut} type="button" variant="outline">
                <LogOut className="size-4" />
                Switch account
              </Button>
            </div>
          ) : null}

          {access.status === "signed-out" ? (
            <form className="space-y-5" onSubmit={onSignIn}>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
                <p className="text-sm text-muted-foreground">Use an active Custodian or Super Admin account.</p>
              </div>

              {authMessage ? <Notice tone="danger">{authMessage}</Notice> : null}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    autoComplete="email"
                    className="h-10"
                    id="email"
                    onChange={(event) => onCredentialsChange({ ...credentials, email: event.target.value })}
                    placeholder="you@pampangastateu.edu.ph"
                    required
                    type="email"
                    value={credentials.email}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    autoComplete="current-password"
                    className="h-10"
                    id="password"
                    onChange={(event) => onCredentialsChange({ ...credentials, password: event.target.value })}
                    required
                    type="password"
                    value={credentials.password}
                  />
                </div>
              </div>

              <Button className="h-10 w-full" type="submit">
                Continue
                <ArrowRight className="size-4" />
              </Button>

              {quickLoginAccounts.length ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                    <span className="h-px flex-1 bg-border" />
                    Demo access
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickLoginAccounts.map((account) => (
                      <Button
                        className="justify-start"
                        disabled={quickLoginRole !== null}
                        key={account.role}
                        onClick={() => onQuickSignIn(account)}
                        type="button"
                        variant="outline"
                      >
                        {quickLoginRole === account.role ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5 text-primary" />}
                        <span className="truncate">{account.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
