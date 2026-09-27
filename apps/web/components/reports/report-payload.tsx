import { formatDateTime, formatLabel } from "@/lib/admin/format";

type ReportPayloadValue = Record<string, unknown> | Record<string, unknown>[];

export function ReportPayload({ payload }: { payload: ReportPayloadValue }) {
  if (Array.isArray(payload)) {
    return <AnalyticsTable rows={payload} />;
  }

  const entries = Object.entries(payload).filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <dl className="report-summary divide-y">
      {entries
        .filter(([key]) => !["location_id", "asset_id"].includes(key))
        .map(([key, value]) => (
          <div className="flex items-baseline justify-between gap-6 py-2.5" key={key}>
            <dt className="text-sm text-muted-foreground">{formatLabel(key)}</dt>
            <dd className="text-right text-sm font-medium">{formatReportValue(key, value)}</dd>
          </div>
        ))}
    </dl>
  );
}

function AnalyticsTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No matching activity was recorded for this period.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Measure</th>
            <th className="px-4 py-3 text-right font-medium">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr className="break-inside-avoid" key={`${String(row.metric ?? row.label ?? "measure")}-${index}`}>
              <td className="px-4 py-3 text-muted-foreground">{String(row.label ?? formatLabel(String(row.metric ?? "Measure")))}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMetricValue(row.value, row.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatReportValue(key: string, value: unknown) {
  if (["from", "to", "generated_at"].includes(key) && typeof value === "string") {
    return formatDateTime(value);
  }

  if (key === "reporting_hours" && typeof value === "string") {
    return value.replace("Monday-Friday", "weekdays").replace("Asia/Manila", "Philippine time");
  }

  return typeof value === "object" ? "—" : String(value);
}

function formatMetricValue(value: unknown, unit: unknown) {
  const number = typeof value === "number" ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) : String(value ?? "—");

  if (unit === "percent") return `${number}%`;
  if (unit === "minutes") return `${number} minutes`;
  if (unit === "count") return number;
  return unit ? `${number} ${String(unit)}` : number;
}
