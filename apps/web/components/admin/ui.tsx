import {
  bookingStatuses,
  defectStatuses,
  formatStatusLabel,
  getBookingStatusTone,
  getDefectStatusTone,
  getRoleTone
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
  return <span className={`badge ${status} ${getStatusTone(status)}`}>{formatStatusLabel(status)}</span>;
}

export function Notice({ children, tone }: { children: ReactNode; tone: "danger" | "neutral" | "success" | "warning" }) {
  return (
    <div className={`notice ${tone}`}>
      <AlertTriangle size={16} />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="empty-state">{label}</div>;
}

function getStatusTone(status: string) {
  if (bookingStatuses.includes(status as never)) {
    return getBookingStatusTone(status as (typeof bookingStatuses)[number]);
  }

  if (defectStatuses.includes(status as never)) {
    return getDefectStatusTone(status as (typeof defectStatuses)[number]);
  }

  if (status === "super_admin" || status === "admin" || status === "instructor") {
    return getRoleTone(status);
  }

  if (status === "available" || status === "excellent" || status === "good") {
    return "success";
  }

  if (status === "retired" || status === "defective") {
    return "danger";
  }

  return "warning";
}
