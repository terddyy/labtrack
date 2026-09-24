import { formatStatusLabel } from "@labtrack/shared";
import type { AssetView, BookingRow, LocationRow, UsageAnalyticsRow } from "@/lib/admin/types";

export function formatLabel(value: string) {
  return formatStatusLabel(value);
}

export function getAssetInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "LT";
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatDateTimeRange(from: string, to: string) {
  try {
    return `${formatDateTime(toIsoFromDateTimeInput(from))} - ${formatDateTime(toIsoFromDateTimeInput(to))}`;
  } catch {
    return "Invalid date range";
  }
}

export function toDateTimeLocalInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function toIsoFromDateTimeInput(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error("Date filter is invalid.");
  }

  return date.toISOString();
}

export function formatBookingResource(booking: BookingRow, assets: AssetView[], locations: LocationRow[]) {
  if (booking.resource_type === "room") {
    return locations.find((location) => location.id === booking.location_id)?.name ?? "Unknown room";
  }

  return assets.find((asset) => asset.id === booking.asset_id)?.name ?? "Unknown equipment";
}

export function formatMetricValue(row: UsageAnalyticsRow) {
  const value = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(row.value);

  if (row.unit === "percent") {
    return `${value}%`;
  }

  if (row.unit === "count") {
    return value;
  }

  return `${value} ${row.unit}`;
}

export function formatReportPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}
