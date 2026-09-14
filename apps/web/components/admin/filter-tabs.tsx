"use client";

import { formatStatusLabel } from "@labtrack/shared";

import { cn } from "@/lib/utils";

export function FilterTabs({
  counts,
  onChange,
  total,
  value
}: {
  counts: Array<[string, number]>;
  onChange: (value: string) => void;
  total: number;
  value: string;
}) {
  const options: Array<[string, number]> = [["all", total], ...counts];

  return (
    <div aria-label="Filter by status" className="-mb-px flex gap-1 overflow-x-auto" role="tablist">
      {options.map(([key, count]) => {
        const isActive = value === key;
        return (
          <button
            aria-selected={isActive}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 pt-1 pb-2.5 text-[13px] capitalize transition-colors focus-visible:outline-2",
              isActive ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            key={key}
            onClick={() => onChange(key)}
            role="tab"
            type="button"
          >
            {key === "all" ? "All" : formatStatusLabel(key)}
            <span
              className={cn(
                "rounded-full px-1.5 font-mono text-[10.5px] tabular",
                isActive ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function countStatuses(statuses: string[], order: readonly string[] = []): Array<[string, number]> {
  const counts = new Map<string, number>(order.map((status) => [status, 0]));
  statuses.forEach((status) => counts.set(status, (counts.get(status) ?? 0) + 1));
  return [...counts.entries()];
}
