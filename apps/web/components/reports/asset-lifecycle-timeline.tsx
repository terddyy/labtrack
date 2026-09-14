import { ClipboardList, History, PackagePlus, QrCode, RefreshCcw, Wrench, type LucideIcon } from "lucide-react";

import { EmptyState, StatusBadge } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/admin/format";
import type { AssetLifecycleEvent, AssetView } from "@/lib/admin/types";

const kindIcons: Record<AssetLifecycleEvent["kind"], LucideIcon> = {
  registered: PackagePlus,
  qr: QrCode,
  borrowing: ClipboardList,
  defect: Wrench,
  lifecycle: RefreshCcw
};

export function AssetLifecycleTimeline({ asset, events }: { asset: AssetView | null; events: AssetLifecycleEvent[] }) {
  if (!asset) {
    return <EmptyState description="Choose equipment in the filters, then run the report." icon={History} label="No equipment selected" />;
  }

  const borrowings = events.filter((event) => event.kind === "borrowing" && event.title === "Borrowing requested").length;
  const defects = events.filter((event) => event.kind === "defect" && event.title === "Defect reported").length;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <Summary label="Equipment" value={asset.name} />
        <Summary label="Property no." value={asset.propertyNumber} />
        <Summary label="Location" value={asset.locationName} />
        <Summary label="Category" value={asset.categoryName} />
        <Summary label="Current status" value={<StatusBadge status={asset.status} />} />
        <Summary label="Condition" value={<StatusBadge status={asset.condition} />} />
        <Summary label="Borrowing requests" value={String(borrowings)} />
        <Summary label="Defect reports" value={String(defects)} />
      </dl>

      {events.length ? (
        <ol className="relative space-y-4 border-l pl-6">
          {events.map((event) => {
            const Icon = kindIcons[event.kind];
            return (
              <li className="relative break-inside-avoid" key={event.id}>
                <span className="absolute top-0.5 -left-[37px] flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground">
                  <Icon className="size-3.5" />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{event.title}</p>
                  {event.status ? <StatusBadge status={event.status} /> : null}
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatDateTime(event.occurredAt)}
                  {event.actorName ? ` · ${event.actorName}` : ""}
                </p>
                {event.detail ? <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState icon={History} label="No lifecycle events recorded" />
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}
