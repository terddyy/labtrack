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
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status} ${getStatusTone(status)}`}>{formatBadgeLabel(status)}</span>;
}

export function Notice({ children, tone }: { children: ReactNode; tone: "danger" | "neutral" | "success" | "warning" }) {
  const isUrgent = tone === "danger" || tone === "warning";

  return (
    <div aria-live={isUrgent ? "assertive" : "polite"} className={`notice ${tone}`} role={isUrgent ? "alert" : "status"}>
      <AlertTriangle size={16} />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="empty-state" role="status">{label}</div>;
}

function getStatusTone(status: string) {
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
