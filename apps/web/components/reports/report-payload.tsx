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

  const isMetrics = rows.every((row) => "metric" in row && "value" in row);
  const columns = isMetrics
    ? ["label", "value"]
    : Object.keys(rows[0] ?? {}).filter((key) => !["id", "asset_id"].includes(key));

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3 font-medium" key={column}>{isMetrics && column === "label" ? "Measure" : isMetrics ? "Result" : formatLabel(column)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr className="break-inside-avoid" key={`${String(row.metric ?? row.label ?? "measure")}-${index}`}>
              {columns.map((column) => (
                <td className="px-4 py-3" key={column}>
                  {isMetrics && column === "value" ? formatMetricValue(row.value, row.unit) : formatCellValue(column, row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCellValue(key: string, value: unknown) {
  if ((key.endsWith("_at") || key === "date") && typeof value === "string") return formatDateTime(value);
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "object" ? "—" : formatLabel(String(value));
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
