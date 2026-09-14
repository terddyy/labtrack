import { Activity, BarChart3, Clock, FileText, Printer, RefreshCw, ScrollText } from "lucide-react";
import type { ReportType } from "@labtrack/shared";

import { EmptyState, Metric, Notice } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeRange, formatLabel, formatMetricValue, formatShortDate } from "@/lib/admin/format";
import type { ActivityLogRow, AssetLifecycleEvent, AssetView, LocationRow, PrintableReportRow, UsageAnalyticsRow } from "@/lib/admin/types";
import { AssetLifecycleTimeline } from "@/components/reports/asset-lifecycle-timeline";
import { ReportPayload } from "@/components/reports/report-payload";

type ReportFilterState = { from: string; to: string; locationId: string; assetId: string };

export const ASSET_LIFECYCLE_REPORT = "asset_lifecycle";
export type ReportView = ReportType | typeof ASSET_LIFECYCLE_REPORT;

const reportTypeLabels: Record<ReportView, string> = {
  asset_management_summary: "Asset Management Summary",
  borrowing_transactions: "Borrowing Transactions",
  defect_reports: "Defect Reports",
  inventory: "Inventory Reports",
  equipment_utilization: "Equipment Utilization",
  asset_lifecycle: "Equipment Lifecycle"
};

const metricIcons = [BarChart3, Activity, Clock, ScrollText];

export function ReportsPanel({
  activityRows,
  assets,
  disabled,
  filters,
  lifecycleEvents,
  locations,
  message,
  onChangeFilters,
  onChangeReportType,
  onPrint,
  onRefresh,
  printableRows,
  reportType,
  usageRows
}: {
  activityRows: ActivityLogRow[];
  assets: AssetView[];
  disabled: boolean;
  filters: ReportFilterState;
  lifecycleEvents: AssetLifecycleEvent[];
  locations: LocationRow[];
  message: string | null;
  onChangeFilters: (filters: ReportFilterState) => void;
  onChangeReportType: (reportType: ReportView) => void;
  onPrint: () => void;
  onRefresh: () => void;
  printableRows: PrintableReportRow[];
  reportType: ReportView;
  usageRows: UsageAnalyticsRow[];
}) {
  const isLifecycle = reportType === ASSET_LIFECYCLE_REPORT;
  const lifecycleAsset = assets.find((asset) => asset.id === filters.assetId) ?? null;
  const canPrint = isLifecycle ? Boolean(lifecycleAsset && lifecycleEvents.length) : printableRows.length > 0;
  const metrics = usageRows.length
    ? usageRows.map((row) => ({ label: row.label, value: formatMetricValue(row) }))
    : [
        { label: "Borrowing transactions", value: "0" },
        { label: "Equipment utilization", value: "0%" },
        { label: "Reporting hours", value: "08–17" },
        { label: "Activity logs", value: String(activityRows.length) }
      ];

  return (
    <div className="flex flex-col gap-4">
      <section className="no-print rounded-xl border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
          <Field id="report-type" label="Report">
            <Select onValueChange={(value) => onChangeReportType(value as ReportView)} value={reportType}>
              <SelectTrigger className="w-full" id="report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(reportTypeLabels) as ReportView[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {reportTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="report-from" label="From">
            <Input className="font-mono text-xs" id="report-from" onChange={(event) => onChangeFilters({ ...filters, from: event.target.value })} type="datetime-local" value={filters.from} />
          </Field>
          <Field id="report-to" label="To">
            <Input className="font-mono text-xs" id="report-to" onChange={(event) => onChangeFilters({ ...filters, to: event.target.value })} type="datetime-local" value={filters.to} />
          </Field>
          <Field id="report-location" label="Room / lab">
            <Select onValueChange={(value) => onChangeFilters({ ...filters, locationId: value === "all" ? "" : value })} value={filters.locationId || "all"}>
              <SelectTrigger className="w-full" id="report-location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rooms and labs</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="report-asset" label="Equipment">
            <Select onValueChange={(value) => onChangeFilters({ ...filters, assetId: value === "all" ? "" : value })} value={filters.assetId || "all"}>
              <SelectTrigger className="w-full" id="report-asset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isLifecycle ? "Select equipment…" : "All equipment"}</SelectItem>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button disabled={disabled} onClick={onRefresh} type="button" variant="outline">
              <RefreshCw className={disabled ? "size-4 animate-spin" : "size-4"} />
              Run
            </Button>
            <Button disabled={!canPrint} onClick={onPrint} type="button">
              <Printer className="size-4" />
              Print
            </Button>
          </div>
        </div>
        {message ? (
          <div className="mt-3">
            <Notice tone="warning">{message}</Notice>
          </div>
        ) : null}
      </section>

      <section aria-label="Report analytics" className="no-print grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Metric icon={metricIcons[index % metricIcons.length]} key={`${metric.label}-${index}`} label={metric.label} value={metric.value} />
        ))}
      </section>

      <article className="printable-report relative overflow-hidden rounded-xl border bg-card">
        <header className="flex flex-col gap-1 border-b bg-muted/30 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">LABTRACK · Report</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{reportTypeLabels[reportType]}</h2>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{formatDateTimeRange(filters.from, filters.to)}</p>
        </header>
        <div className="p-6">
          {isLifecycle ? (
            disabled ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <AssetLifecycleTimeline asset={lifecycleAsset} events={lifecycleEvents} />
            )
          ) : disabled && !printableRows.length ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : printableRows.length ? (
            <div className="grid gap-6 md:grid-cols-2">
              {printableRows.map((row) => (
                <section key={`${row.report_type}-${row.section}`}>
                  <h3 className="mb-2 border-b pb-2 text-sm font-semibold capitalize">{formatLabel(row.section)}</h3>
                  <ReportPayload payload={row.payload} />
                </section>
              ))}
            </div>
          ) : (
            <EmptyState description="Adjust the filters and run the report again." icon={FileText} label="No report data" />
          )}
        </div>
      </article>

      <section className="no-print overflow-hidden rounded-xl border bg-card">
        <header className="flex items-center gap-2 border-b px-5 py-4">
          <Activity className="size-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold tracking-tight">Activity log</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular">{activityRows.length}</span>
        </header>
        <div className="max-h-[480px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-5">Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="pr-5">Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-5 font-mono text-xs text-muted-foreground tabular">{formatShortDate(row.created_at)}</TableCell>
                  <TableCell className="font-medium">{row.actor_name ?? row.actor_email ?? "System"}</TableCell>
                  <TableCell className="capitalize">{formatLabel(row.action)}</TableCell>
                  <TableCell className="pr-5">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{row.entity_table}</code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!activityRows.length ? (
          <div className="p-5">
            <EmptyState icon={Activity} label="No activity in this range" />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Field({ children, id, label }: { children: React.ReactNode; id: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      {children}
    </div>
  );
}
