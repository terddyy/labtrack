"use client";

import { ArrowRight, ClipboardList, Package, Plus, QrCode, Wrench } from "lucide-react";

import { Metric, getStatusTone } from "@/components/admin/ui";
import type { AdminSection } from "@/components/app-shell";
import { CategoryAnalytics } from "@/components/dashboard/category-analytics";
import { TicketInbox } from "@/components/dashboard/ticket-inbox";
import { WorkflowPanel } from "@/components/dashboard/workflow-panel";
import { Button } from "@/components/ui/button";
import { formatBookingResource, formatLabel, formatShortDate } from "@/lib/admin/format";
import type { DashboardData } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type Counters = NonNullable<DashboardData["counters"]>;

const barTone = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground/40"
} as const;

export function DashboardOverview({
  counters,
  data,
  firstName,
  onNavigate,
  onOpenThread
}: {
  counters: Counters;
  data: DashboardData;
  firstName: string;
  onNavigate: (section: AdminSection) => void;
  onOpenThread: (threadId: string) => void;
}) {
  const qrCoverage = counters.registeredAssets ? Math.round((counters.activeQrCodes / counters.registeredAssets) * 100) : 0;
  const statusMix = countBy(data.bookings.map((booking) => booking.status));

  return (
    <div className="flex flex-col gap-6">
      <section className="animate-rise flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground" suppressHydrationWarning>
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight" suppressHydrationWarning>
            {greeting()}, {firstName}.{" "}
            <span className="font-normal text-muted-foreground">
              {counters.pendingBookings
                ? `${counters.pendingBookings} request${counters.pendingBookings === 1 ? "" : "s"} waiting on you.`
                : "The borrowing queue is clear."}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onNavigate("assets")} size="sm" type="button" variant="outline">
            <Plus className="size-3.5" />
            Register asset
          </Button>
          <Button onClick={() => onNavigate("bookings")} size="sm" type="button">
            Review requests
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </section>

      <section aria-label="Operational summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric hint={`${data.locations.length} locations · ${data.categories.length} categories`} icon={Package} label="Registered assets" value={String(counters.registeredAssets)} />
        <Metric
          hint={counters.pendingBookings ? "Awaiting a decision" : "Nothing pending"}
          icon={ClipboardList}
          label="Pending borrowing"
          tone={counters.pendingBookings ? "warning" : "neutral"}
          value={String(counters.pendingBookings)}
        />
        <Metric
          hint={counters.openDefects ? "Needs triage" : "All reports handled"}
          icon={Wrench}
          label="Open defects"
          tone={counters.openDefects ? "danger" : "success"}
          value={String(counters.openDefects)}
        />
        <Metric hint={`${qrCoverage}% of the register is tagged`} icon={QrCode} label="Active QR codes" tone="success" value={String(counters.activeQrCodes)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <WorkflowPanel
          description="Latest room and equipment requests"
          emptyLabel="No borrowing requests yet."
          icon={ClipboardList}
          items={data.bookings.slice(0, 6).map((booking) => ({
            id: booking.id,
            title: formatBookingResource(booking, data.assets, data.locations),
            detail: booking.purpose,
            meta: formatShortDate(booking.requested_start_at),
            status: booking.status
          }))}
          onViewAll={() => onNavigate("bookings")}
          title="Borrowing queue"
        >
          {data.bookings.length ? (
            <div className="border-b px-5 py-3">
              <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                {statusMix.map(([status, count]) => (
                  <span
                    className={cn("h-full", barTone[getStatusTone(status)])}
                    key={status}
                    style={{ width: `${(count / data.bookings.length) * 100}%` }}
                    title={`${formatLabel(status)}: ${count}`}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {statusMix.map(([status, count]) => (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize" key={status}>
                    <span className={cn("size-1.5 rounded-full", barTone[getStatusTone(status)])} />
                    {formatLabel(status)}
                    <span className="font-mono text-foreground tabular">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </WorkflowPanel>

        <WorkflowPanel
          description="Reported issues across the register"
          emptyLabel="No defect reports."
          icon={Wrench}
          items={data.defects.slice(0, 6).map((report) => ({
            id: report.id,
            title: report.title,
            detail: data.assets.find((asset) => asset.id === report.asset_id)?.name ?? report.description,
            status: report.status
          }))}
          onViewAll={() => onNavigate("defects")}
          title="Defect triage"
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[1.35fr_1fr]">
        <CategoryAnalytics data={data} />
        <TicketInbox onOpenThread={onOpenThread} onViewAll={() => onNavigate("tickets")} profiles={data.profiles} threads={data.ticketThreads} />
      </section>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
