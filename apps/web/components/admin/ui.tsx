import {
  bookingStatuses,
  defectStatuses,
  formatStatusLabel,
  getBookingStatusTone,
  getDefectStatusTone,
  getRoleDisplayLabel,
  getRoleTone,
  userRoles
} from "@labtrack/shared";
import { AlertTriangle, CheckCircle2, Info, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type NoticeTone = "danger" | "neutral" | "success" | "warning";
type Tone = ReturnType<typeof getStatusTone>;

const noticeIcons = {
  danger: AlertTriangle,
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle
} as const;

const noticeClasses: Record<NoticeTone, string> = {
  success: "border-success/30 bg-success/8 text-foreground [&>svg]:text-success",
  warning: "border-warning/40 bg-warning/10 text-foreground [&>svg]:text-warning",
  danger: "border-destructive/30 bg-destructive/8 [&>svg]:text-destructive",
  neutral: "border-border bg-muted/60 text-foreground [&>svg]:text-muted-foreground"
};

const pillClasses: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/12 text-warning-foreground ring-warning/30",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  neutral: "bg-muted text-muted-foreground ring-border"
};

const dotClasses: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground/60"
};

export function Metric({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
  className
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-4 shadow-[0_1px_0_0_oklch(0_0_0/0.02)] transition-colors hover:border-foreground/15",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex size-7 items-center justify-center rounded-md ring-1 ring-inset", pillClasses[tone])}>
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-mono text-3xl font-medium tracking-tight tabular">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100", dotClasses[tone])} />
    </div>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = getStatusTone(status);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        pillClasses[tone],
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", dotClasses[tone])} />
      {formatBadgeLabel(status)}
    </span>
  );
}

export function Notice({ children, tone }: { children: ReactNode; tone: NoticeTone }) {
  const isUrgent = tone === "danger" || tone === "warning";
  const Icon = noticeIcons[tone];

  return (
    <Alert
      aria-live={isUrgent ? "assertive" : "polite"}
      className={noticeClasses[tone]}
      role={isUrgent ? "alert" : "status"}
      variant={tone === "danger" ? "destructive" : "default"}
    >
      <Icon className="size-4" />
      <AlertDescription className="text-foreground/85">{children}</AlertDescription>
    </Alert>
  );
}

export function EmptyState({
  label,
  description,
  icon: Icon = Inbox,
  className
}: {
  label: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center", className)}
      role="status"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4.5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

export function Initials({ name, className }: { name: string | null | undefined; className?: string }) {
  const initials = (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground",
        className
      )}
    >
      {initials || "?"}
    </span>
  );
}

export function getStatusTone(status: string) {
  if (bookingStatuses.includes(status as never)) {
    return getBookingStatusTone(status as (typeof bookingStatuses)[number]);
  }

  if (defectStatuses.includes(status as never)) {
    return getDefectStatusTone(status as (typeof defectStatuses)[number]);
  }

  if (userRoles.includes(status as never)) {
    return getRoleTone(status as (typeof userRoles)[number]);
  }

  if (status === "available" || status === "excellent" || status === "good") {
    return "success";
  }

  if (status === "retired" || status === "defective") {
    return "danger";
  }

  return "warning";
}

function formatBadgeLabel(status: string) {
  if (userRoles.includes(status as never)) {
    return getRoleDisplayLabel(status as (typeof userRoles)[number]);
  }

  return formatStatusLabel(status);
}
