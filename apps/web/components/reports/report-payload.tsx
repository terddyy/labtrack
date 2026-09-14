import { formatLabel, formatReportPayload } from "@/lib/admin/format";

export function ReportPayload({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload);
  const isFlat = entries.every(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value));

  if (!isFlat) {
    return (
      <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {formatReportPayload(payload)}
      </pre>
    );
  }

  return (
    <dl className="divide-y divide-dashed">
      {entries.map(([key, value]) => (
        <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm" key={key}>
          <dt className="text-muted-foreground capitalize">{formatLabel(key)}</dt>
          <dd className="font-mono tabular">{value === null ? "—" : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
