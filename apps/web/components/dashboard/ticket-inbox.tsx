"use client";

import { ArrowRight, ClipboardList, MessagesSquare, Wrench } from "lucide-react";

import { EmptyState, Initials } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatLabel, formatShortDate } from "@/lib/admin/format";
import type { ProfileRow, TicketThreadRow } from "@/lib/admin/types";

export function TicketInbox({
  onOpenThread,
  onViewAll,
  profiles,
  threads
}: {
  onOpenThread: (threadId: string) => void;
  onViewAll: () => void;
  profiles: ProfileRow[];
  threads: TicketThreadRow[];
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold tracking-tight">Tickets & messages</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular">{threads.length}</span>
        </div>
        <Button onClick={onViewAll} size="sm" type="button" variant="ghost">
          View all
          <ArrowRight className="size-3.5" />
        </Button>
      </header>
      {threads.length ? (
        <ul className="divide-y">
          {threads.slice(0, 6).map((thread) => {
            const requester = profiles.find((profile) => profile.id === thread.requester_id);
            const Icon = thread.subject_type === "booking" ? ClipboardList : thread.subject_type === "general" ? MessagesSquare : Wrench;
            return (
              <li key={thread.id}>
                <button
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50"
                  onClick={() => onOpenThread(thread.id)}
                  type="button"
                >
                  <Initials name={requester?.full_name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{requester?.full_name ?? "Unknown user"}</span>
                    <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <Icon className="size-3 shrink-0" />
                      <span className="capitalize">{formatLabel(thread.subject_type)}</span>
                      {thread.subject_title ? <span className="truncate">· {thread.subject_title}</span> : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatShortDate(thread.created_at)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-4">
          <EmptyState icon={MessagesSquare} label="No ticket threads yet" />
        </div>
      )}
    </section>
  );
}
