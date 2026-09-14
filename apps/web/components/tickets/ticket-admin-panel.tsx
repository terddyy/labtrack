"use client";

import { ClipboardList, MessagesSquare, RefreshCw, SendHorizontal, Wrench } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

import { formatLabel, formatShortDate } from "@/lib/admin/format";
import { EmptyState, Initials } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProfileRow, TicketMessageRow, TicketThreadRow } from "@/lib/admin/types";

export function TicketAdminPanel({
  currentProfileId,
  disabled,
  messages,
  onBodyChange,
  onRefresh,
  onSelectThread,
  onSend,
  profiles,
  selectedThreadId,
  ticketBody,
  threads
}: {
  currentProfileId: string;
  disabled: boolean;
  messages: TicketMessageRow[];
  onBodyChange: (body: string) => void;
  onRefresh: () => void;
  onSelectThread: (threadId: string) => void;
  onSend: () => void;
  profiles: ProfileRow[];
  selectedThreadId: string | null;
  ticketBody: string;
  threads: TicketThreadRow[];
}) {
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;
  const selectedRequester = profiles.find((profile) => profile.id === selectedThread?.requester_id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && ticketBody.trim() && !disabled) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <section className="grid min-h-[560px] overflow-hidden rounded-xl border bg-card md:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b md:border-r md:border-b-0">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Threads</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular">{threads.length}</span>
        </header>
        {threads.length ? (
          <ul className="flex-1 overflow-y-auto p-2">
            {threads.map((thread) => {
              const isActive = thread.id === selectedThreadId;
              const Icon = thread.subject_type === "booking" ? ClipboardList : Wrench;
              const requester = profiles.find((profile) => profile.id === thread.requester_id);
              return (
                <li key={thread.id}>
                  <button
                    aria-current={isActive}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"
                    )}
                    onClick={() => onSelectThread(thread.id)}
                    type="button"
                  >
                    <Initials className={cn("mt-0.5", isActive && "ring-2 ring-primary/30")} name={requester?.full_name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{requester?.full_name ?? "Unknown user"}</span>
                      <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
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
            <EmptyState icon={MessagesSquare} label="No threads yet" />
          </div>
        )}
      </aside>

      <div className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">
              {selectedThread ? (selectedRequester?.full_name ?? "Unknown user") : "Conversation"}
            </h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {selectedThread
                ? `${formatLabel(selectedThread.subject_type)}${selectedThread.subject_title ? ` · ${selectedThread.subject_title}` : ""}`
                : "Select a thread to read and reply"}
            </p>
          </div>
          <Button aria-label="Refresh messages" disabled={!selectedThread} onClick={onRefresh} size="icon" type="button" variant="ghost">
            <RefreshCw className="size-4" />
          </Button>
        </header>

        <div className="flex max-h-[520px] min-h-[360px] flex-1 flex-col gap-3 overflow-y-auto bg-muted/25 p-4" ref={scrollRef}>
          {messages.length ? (
            messages.map((message) => {
              const isMine = message.sender_id === currentProfileId;
              const sender = profiles.find((profile) => profile.id === message.sender_id);
              return (
                <div className={cn("flex max-w-[85%] items-end gap-2", isMine ? "flex-row-reverse self-end" : "self-start")} key={message.id}>
                  <Initials className="size-7 text-[10px]" name={sender?.full_name ?? (isMine ? "You" : "?")} />
                  <div className={cn("space-y-1", isMine && "text-right")}>
                    {!isMine ? <p className="px-1 text-xs font-medium">{sender?.full_name ?? "Unknown"}</p> : null}
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap text-left",
                        isMine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border bg-card"
                      )}
                    >
                      {message.body}
                    </div>
                    <p className="px-1 text-[11px] text-muted-foreground">
                      {isMine ? "You · " : ""}{formatShortDate(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="m-auto">
              <EmptyState
                className="border-0"
                description={selectedThread ? "Start the conversation below." : "Pick a thread from the list."}
                icon={MessagesSquare}
                label={selectedThread ? "No messages yet" : "No thread selected"}
              />
            </div>
          )}
        </div>

        {selectedThread ? (
          <div className="border-t p-3">
            <div className="rounded-lg border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
              <Textarea
                aria-label="Reply"
                className="min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                onChange={(event) => onBodyChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a reply…"
                rows={2}
                value={ticketBody}
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[11px] text-muted-foreground">Ctrl + Enter to send</span>
                <Button disabled={disabled || !ticketBody.trim()} onClick={onSend} size="sm" type="button">
                  Send
                  <SendHorizontal className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
