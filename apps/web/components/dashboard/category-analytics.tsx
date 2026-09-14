"use client";

import { assetStatuses } from "@labtrack/shared";
import { BarChart3, ClipboardList, Package, Wrench, type LucideIcon } from "lucide-react";

import { getStatusTone } from "@/components/admin/ui";
import { formatLabel } from "@/lib/admin/format";
import type { DashboardData } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type BreakdownRow = { key: string; label: string; count: number };

const ROOM_KEY = "__rooms__";

const statusBarTone = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground/40"
} as const;

export function CategoryAnalytics({ data }: { data: DashboardData }) {
  const categoryOf = new Map(data.assets.map((asset) => [asset.id, asset.categoryId]));
  const assetRows = countByCategory(data, data.assets.map((asset) => asset.categoryId));
  const borrowingRows = countByCategory(
    data,
    data.bookings.map((booking) => (booking.resource_type === "room" ? ROOM_KEY : categoryOf.get(booking.asset_id ?? "") ?? null))
  );
  const defectRows = countByCategory(data, data.defects.map((report) => categoryOf.get(report.asset_id) ?? null));
  const statusRows = assetStatuses
    .map((status) => ({ key: status, label: formatLabel(status), count: data.assets.filter((asset) => asset.status === status).length }))
    .filter((row) => row.count > 0);

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-start gap-3 border-b px-5 py-4">
        <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <BarChart3 className="size-4" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Analytics by category</h2>
          <p className="text-[13px] text-muted-foreground">
            Share of registered assets, borrowing requests, and defect reports per category (latest {data.bookings.length} requests, {data.defects.length} reports).
          </p>
        </div>
      </header>

      <div className="border-b px-5 py-4">
        <p className="mb-2 text-[13px] font-medium">Asset status</p>
        {statusRows.length ? (
          <>
            <div aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {statusRows.map((row) => (
                <span
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", statusBarTone[getStatusTone(row.key)])}
                  key={row.key}
                  style={{ width: `${(row.count / data.assets.length) * 100}%` }}
                  title={`${row.label}: ${row.count} (${percent(row.count, data.assets.length)})`}
                />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {statusRows.map((row) => (
                <li className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize" key={row.key}>
                  <span className={cn("size-2 rounded-full", statusBarTone[getStatusTone(row.key)])} />
                  {row.label}
                  <span className="font-mono text-foreground tabular">{row.count}</span>
                  <span className="font-mono tabular">({percent(row.count, data.assets.length)})</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No registered assets yet.</p>
        )}
      </div>

      <div className="grid gap-px bg-border md:grid-cols-3">
        <BreakdownList icon={Package} rows={assetRows} title="Registered assets" />
        <BreakdownList icon={ClipboardList} rows={borrowingRows} title="Borrowing requests" />
        <BreakdownList icon={Wrench} rows={defectRows} title="Defect reports" />
      </div>
    </section>
  );
}

function BreakdownList({ icon: Icon, rows, title }: { icon: LucideIcon; rows: BreakdownRow[]; title: string }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="bg-card px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-medium">
          <Icon className="size-3.5 text-muted-foreground" />
          {title}
        </p>
        <span className="font-mono text-xs text-muted-foreground tabular">{total} total</span>
      </div>
      {total ? (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.key} title={`${row.label}: ${row.count} (${percent(row.count, total)})`}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate">{row.label}</span>
                <span className="shrink-0 font-mono tabular">
                  {row.count} <span className="text-muted-foreground">· {percent(row.count, total)}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      )}
    </div>
  );
}

function countByCategory(data: DashboardData, keys: Array<string | null>): BreakdownRow[] {
  const counts = new Map<string, number>();
  keys.forEach((key) => {
    const bucket = key ?? "__unknown__";
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });
  const names = new Map(data.categories.map((category) => [category.id, category.name]));

  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      count,
      label: key === ROOM_KEY ? "Rooms" : names.get(key) ?? "Uncategorized"
    }))
    .sort((a, b) => b.count - a.count);
}

function percent(count: number, total: number) {
  return total ? `${Math.round((count / total) * 100)}%` : "0%";
}
