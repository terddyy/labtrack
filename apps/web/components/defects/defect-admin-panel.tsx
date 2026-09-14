"use client";

import { defectStatuses, getDefectTransitions } from "@labtrack/shared";
import { Package, Wrench } from "lucide-react";
import { useState } from "react";

import { EmptyState, Initials, StatusBadge } from "@/components/admin/ui";
import { FilterTabs, countStatuses } from "@/components/admin/filter-tabs";
import { Button } from "@/components/ui/button";
import type { AssetView, DefectRow, ProfileRow } from "@/lib/admin/types";

export function DefectAdminPanel({
  assets,
  disabled,
  onTriage,
  profiles,
  reports
}: {
  assets: AssetView[];
  disabled: boolean;
  onTriage: (report: DefectRow, status: "under_review" | "sent_for_repair" | "resolved" | "rejected") => void;
  profiles: ProfileRow[];
  reports: DefectRow[];
}) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? reports : reports.filter((report) => report.status === filter);

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="border-b px-4 pt-3">
        <FilterTabs counts={countStatuses(reports.map((report) => report.status), defectStatuses)} onChange={setFilter} total={reports.length} value={filter} />
      </header>

      {visible.length ? (
        <ul className="grid gap-px bg-border md:grid-cols-2">
          {visible.map((report) => {
            const asset = assets.find((item) => item.id === report.asset_id);
            const reporter = profiles.find((profile) => profile.id === report.instructor_id);
            const transitions = getDefectTransitions(report.status);

            return (
              <li className="flex flex-col gap-3 bg-card p-4" key={report.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{report.title}</p>
                  <StatusBadge status={report.status} />
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{report.description}</p>
                {report.resolution_notes ? (
                  <p className="rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">{report.resolution_notes}</p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Package className="size-3.5" />
                    {asset?.name ?? "Unknown asset"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Initials className="size-5 text-[9px]" name={reporter?.full_name} />
                    {reporter?.full_name ?? "Unknown reporter"}
                  </span>
                </div>
                {transitions.length ? (
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {transitions.includes("under_review") ? (
                      <Button disabled={disabled} onClick={() => onTriage(report, "under_review")} size="sm" type="button" variant="outline">
                        Start review
                      </Button>
                    ) : null}
                    {transitions.includes("sent_for_repair") ? (
                      <Button disabled={disabled} onClick={() => onTriage(report, "sent_for_repair")} size="sm" type="button" variant="outline">
                        Send for repair
                      </Button>
                    ) : null}
                    {transitions.includes("resolved") ? (
                      <Button disabled={disabled} onClick={() => onTriage(report, "resolved")} size="sm" type="button">
                        Resolve
                      </Button>
                    ) : null}
                    {transitions.includes("rejected") ? (
                      <Button className="ml-auto" disabled={disabled} onClick={() => onTriage(report, "rejected")} size="sm" type="button" variant="ghost">
                        Reject
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
          {visible.length % 2 ? <li aria-hidden className="hidden bg-card md:block" /> : null}
        </ul>
      ) : (
        <div className="p-4">
          <EmptyState
            description={filter === "all" ? "Defects reported from the mobile app land here." : "No reports match this status."}
            icon={Wrench}
            label="No defect reports"
          />
        </div>
      )}
    </section>
  );
}
