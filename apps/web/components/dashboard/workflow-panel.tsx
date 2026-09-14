import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState, StatusBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

export type WorkflowItem = { id: string; title: string; detail: string; meta?: string; status: string };

export function WorkflowPanel({
  title,
  description,
  icon: Icon,
  items,
  emptyLabel = "Nothing here yet.",
  onViewAll,
  children
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  items: WorkflowItem[];
  emptyLabel?: string;
  onViewAll?: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
            {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {onViewAll ? (
          <Button className="-mr-2 text-muted-foreground" onClick={onViewAll} size="sm" type="button" variant="ghost">
            View all
            <ArrowUpRight className="size-3.5" />
          </Button>
        ) : null}
      </header>
      {children}
      {items.length ? (
        <ul className="divide-y">
          {items.map((item) => (
            <li className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50" key={item.id}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background font-mono text-[11px] font-medium text-muted-foreground uppercase">
                {item.title.slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-[13px] text-muted-foreground">{item.detail}</p>
              </div>
              {item.meta ? (
                <span className="hidden shrink-0 font-mono text-xs text-muted-foreground tabular lg:inline">{item.meta}</span>
              ) : null}
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-5">
          <EmptyState label={emptyLabel} />
        </div>
      )}
    </section>
  );
}
