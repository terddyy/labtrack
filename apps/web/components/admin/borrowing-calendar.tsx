"use client";

import { formatStatusLabel, getBookingWorkflowActions, type BookingStatus } from "@labtrack/shared";
import { CalendarDays, ChevronLeft, ChevronRight, MousePointerClick, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, Initials, Notice, StatusBadge } from "@/components/admin/ui";
import {
  addDays,
  buildCalendarDays,
  buildTimeSlots,
  createWeekRange,
  formatAgendaHeading,
  formatDateKey,
  formatResource,
  formatTimeFromMinutes,
  formatTimeRange,
  formatWeekLabel,
  getConflictLabel,
  getEventStyle,
  getVisibleWindow,
  parseDate,
  slotHeightPx,
  startOfWeek,
  summarizeRows,
  toDateTimeLocalInput
} from "@/components/admin/calendar-utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AssetView, BorrowingMonitorRow, LocationRow } from "@/lib/admin/types";

export type BorrowingCalendarStatusFilter = "all" | BookingStatus;
export type BorrowingCalendarFilters = {
  from: string;
  to: string;
  locationId: string;
  resourceId: string;
  status: BorrowingCalendarStatusFilter;
};
export type BorrowingCalendarActionTarget = Pick<BorrowingMonitorRow, "id" | "status">;

const monitorStatusOptions: BorrowingCalendarStatusFilter[] = ["all", "pending", "approved", "checked_out", "returned", "cancelled", "rejected"];

const eventTone: Record<string, string> = {
  pending: "border-warning bg-warning/12 text-foreground hover:bg-warning/20",
  approved: "border-primary bg-primary/10 text-foreground hover:bg-primary/18",
  checked_out: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  returned: "border-success bg-success/10 text-foreground hover:bg-success/18",
  cancelled: "border-muted-foreground/40 bg-muted text-muted-foreground line-through",
  rejected: "border-destructive/60 bg-destructive/8 text-muted-foreground"
};

export function BorrowingCalendar({
  actionsDisabled,
  assets,
  disabled,
  filters,
  locations,
  message,
  onApprove,
  onCancel,
  onChangeFilters,
  onCheckout,
  onRefresh,
  onReject,
  onReturn,
  rows
}: {
  actionsDisabled: boolean;
  assets: AssetView[];
  disabled: boolean;
  filters: BorrowingCalendarFilters;
  locations: LocationRow[];
  message: string | null;
  onApprove: (booking: BorrowingCalendarActionTarget) => void;
  onCancel: (booking: BorrowingCalendarActionTarget) => void;
  onChangeFilters: (filters: BorrowingCalendarFilters) => void;
  onCheckout: (booking: BorrowingCalendarActionTarget) => void;
  onRefresh: () => void;
  onReject: (booking: BorrowingCalendarActionTarget) => void;
  onReturn: (booking: BorrowingCalendarActionTarget) => void;
  rows: BorrowingMonitorRow[];
}) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const weekStart = useMemo(() => startOfWeek(parseDate(filters.from) ?? new Date()), [filters.from]);
  const visibleWindow = useMemo(() => getVisibleWindow(rows, weekStart), [rows, weekStart]);
  const timeSlots = useMemo(() => buildTimeSlots(visibleWindow.startHour, visibleWindow.endHour), [visibleWindow]);
  const days = useMemo(() => buildCalendarDays(rows, weekStart), [rows, weekStart]);
  const summary = useMemo(() => summarizeRows(rows), [rows]);
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? null;
  const contentHeight = timeSlots.length * slotHeightPx;
  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    if (selectedRowId && !rows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(null);
    }
  }, [rows, selectedRowId]);

  function handleWeekChange(nextWeekStart: Date) {
    const range = createWeekRange(nextWeekStart);
    onChangeFilters({ ...filters, from: toDateTimeLocalInput(range.from), to: toDateTimeLocalInput(range.to) });
  }

  function handleFilterChange(updates: Partial<Pick<BorrowingCalendarFilters, "locationId" | "resourceId" | "status">>) {
    onChangeFilters({ ...filters, ...updates });
  }

  return (
    <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-xl border bg-card">
        <header className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border p-0.5">
              <Button aria-label="Previous week" className="size-7" disabled={disabled} onClick={() => handleWeekChange(addDays(weekStart, -7))} size="icon" type="button" variant="ghost">
                <ChevronLeft className="size-4" />
              </Button>
              <Button className="h-7 px-2.5" disabled={disabled} onClick={() => handleWeekChange(new Date())} size="sm" type="button" variant="ghost">
                Today
              </Button>
              <Button aria-label="Next week" className="size-7" disabled={disabled} onClick={() => handleWeekChange(addDays(weekStart, 7))} size="icon" type="button" variant="ghost">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <h2 className="text-[15px] font-semibold tracking-tight">{formatWeekLabel(weekStart)}</h2>
            <Button aria-label="Refresh calendar" className="size-8 text-muted-foreground" disabled={disabled} onClick={onRefresh} size="icon" type="button" variant="ghost">
              <RefreshCw className={cn("size-4", disabled && "animate-spin")} />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
            <FilterSelect id="monitor-location" label="Room / lab" onChange={(value) => handleFilterChange({ locationId: value })} value={filters.locationId}>
              <SelectItem value="all">All rooms and labs</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect id="monitor-resource" label="Resource" onChange={(value) => handleFilterChange({ resourceId: value })} value={filters.resourceId}>
              <SelectItem value="all">All resources</SelectItem>
              <SelectGroup>
                <SelectLabel>Rooms</SelectLabel>
                {locations.map((location) => (
                  <SelectItem key={`room-${location.id}`} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Equipment</SelectLabel>
                {assets.map((asset) => (
                  <SelectItem key={`asset-${asset.id}`} value={asset.id}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </FilterSelect>
            <FilterSelect
              id="monitor-status"
              label="Status"
              onChange={(value) => handleFilterChange({ status: (value || "all") as BorrowingCalendarStatusFilter })}
              value={filters.status === "all" ? "" : filters.status}
            >
              {monitorStatusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === "all" ? "All statuses" : formatStatusLabel(status)}
                </SelectItem>
              ))}
            </FilterSelect>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <Legend className="bg-muted-foreground/50" label="Visible" value={summary.total} />
          <Legend className="bg-warning" label="Tentative" value={summary.pending} />
          <Legend className="bg-primary" label="Blocking" value={summary.blocking} />
          <Legend className="bg-success" label="Closed" value={summary.closed} />
        </div>

        {message ? (
          <div className="border-b p-4">
            <Notice tone="warning">{message}</Notice>
          </div>
        ) : null}

        <div className="hidden overflow-x-auto md:block">
          <div className="grid min-w-[760px] grid-cols-[56px_repeat(7,minmax(0,1fr))]">
            <div className="sticky left-0 z-10 border-r bg-card">
              <div className="h-12 border-b" />
              <div className="relative" style={{ height: contentHeight }}>
                {timeSlots.map((minutes, index) =>
                  minutes % 60 === 0 ? (
                    <span className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground tabular" key={minutes} style={{ top: index * slotHeightPx }}>
                      {index === 0 ? "" : formatTimeFromMinutes(minutes)}
                    </span>
                  ) : null
                )}
              </div>
            </div>

            {days.map((day) => {
              const isToday = day.key === todayKey;
              return (
                <div className={cn("border-r last:border-r-0", isToday && "bg-primary/[0.03]")} key={day.key}>
                  <div className="flex h-12 flex-col items-center justify-center border-b">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {day.date.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 items-center justify-center rounded-full font-mono text-xs tabular",
                        isToday && "bg-primary font-semibold text-primary-foreground"
                      )}
                    >
                      {day.date.getDate()}
                    </span>
                  </div>
                  <div className="relative" style={{ height: contentHeight }}>
                    {timeSlots.map((minutes, index) => (
                      <div
                        className={cn("pointer-events-none absolute inset-x-0 border-t", minutes % 60 === 0 ? "border-border" : "border-dashed border-border/50")}
                        key={minutes}
                        style={{ top: index * slotHeightPx }}
                      />
                    ))}
                    {day.events.map((event) => (
                      <button
                        aria-pressed={selectedRowId === event.row.id}
                        className={cn(
                          "absolute flex flex-col overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] leading-tight shadow-xs transition-all",
                          eventTone[event.row.status] ?? eventTone.approved,
                          selectedRowId === event.row.id && "ring-2 ring-ring ring-offset-1 ring-offset-card"
                        )}
                        key={`${day.key}-${event.row.id}`}
                        onClick={() => setSelectedRowId(event.row.id)}
                        style={getEventStyle(event, visibleWindow.startHour)}
                        type="button"
                      >
                        <span className="truncate font-semibold">{formatResource(event.row, assets, locations)}</span>
                        <span className="truncate font-mono text-[10px] opacity-75">{formatTimeRange(event.row.requested_start_at, event.row.requested_end_at)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="divide-y md:hidden">
          {days.map((day) => (
            <section className="p-4" key={`agenda-${day.key}`}>
              <h3 className="mb-2 flex items-center justify-between text-sm font-medium">
                {formatAgendaHeading(day.date)}
                <span className="rounded-full bg-muted px-2 font-mono text-xs text-muted-foreground">{day.events.length}</span>
              </h3>
              {day.events.length ? (
                <div className="space-y-2">
                  {day.events.map((event) => (
                    <button
                      className="flex w-full items-center justify-between gap-2 rounded-lg border p-2.5 text-left text-sm hover:bg-muted/50"
                      key={`agenda-${day.key}-${event.row.id}`}
                      onClick={() => setSelectedRowId(event.row.id)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{formatResource(event.row, assets, locations)}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{formatTimeRange(event.row.requested_start_at, event.row.requested_end_at)}</span>
                      </span>
                      <StatusBadge status={event.row.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No schedules.</p>
              )}
            </section>
          ))}
        </div>

        {!rows.length && !disabled ? (
          <div className="border-t p-4">
            <EmptyState description="Use the arrows to browse other weeks." icon={CalendarDays} label="No bookings this week" />
          </div>
        ) : null}
      </div>

      <BookingDetail
        actionsDisabled={actionsDisabled}
        assets={assets}
        locations={locations}
        onApprove={onApprove}
        onCancel={onCancel}
        onCheckout={onCheckout}
        onReject={onReject}
        onReturn={onReturn}
        row={selectedRow}
      />
    </section>
  );
}

function BookingDetail({
  actionsDisabled,
  assets,
  locations,
  onApprove,
  onCancel,
  onCheckout,
  onReject,
  onReturn,
  row
}: {
  actionsDisabled: boolean;
  assets: AssetView[];
  locations: LocationRow[];
  onApprove: (booking: BorrowingCalendarActionTarget) => void;
  onCancel: (booking: BorrowingCalendarActionTarget) => void;
  onCheckout: (booking: BorrowingCalendarActionTarget) => void;
  onReject: (booking: BorrowingCalendarActionTarget) => void;
  onReturn: (booking: BorrowingCalendarActionTarget) => void;
  row: BorrowingMonitorRow | null;
}) {
  if (!row) {
    return (
      <aside className="rounded-xl border border-dashed bg-card/50 p-6 xl:sticky xl:top-20">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MousePointerClick className="size-4.5" />
          </span>
          <p className="text-sm font-medium">No booking selected</p>
          <p className="max-w-[220px] text-sm text-muted-foreground">Click a block on the calendar to see details and actions.</p>
        </div>
      </aside>
    );
  }

  const actions = getBookingWorkflowActions(row.status);
  const borrower = row.borrower_name ?? row.borrower_email ?? "Unknown borrower";
  const start = new Date(row.requested_start_at);
  const end = new Date(row.requested_end_at);

  return (
    <aside className="animate-rise overflow-hidden rounded-xl border bg-card xl:sticky xl:top-20" key={row.id}>
      <header className="space-y-2 border-b p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {row.resource_type === "room" ? "Room" : "Equipment"}
          </span>
          <StatusBadge status={row.status} />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">{formatResource(row, assets, locations)}</h3>
      </header>
      <dl className="divide-y text-sm">
        <div className="flex items-center gap-3 px-5 py-3">
          <Initials name={borrower} />
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Borrower</dt>
            <dd className="truncate font-medium">{borrower}</dd>
          </div>
        </div>
        <div className="px-5 py-3">
          <dt className="text-xs text-muted-foreground">Schedule</dt>
          <dd className="mt-0.5 font-medium">{start.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</dd>
          <dd className="font-mono text-xs text-muted-foreground">{formatTimeRange(row.requested_start_at, row.requested_end_at)}{start.toDateString() !== end.toDateString() ? ` (ends ${end.toLocaleDateString()})` : ""}</dd>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <dt className="text-xs text-muted-foreground">Availability</dt>
          <dd className="text-xs font-medium">{getConflictLabel(row.status)}</dd>
        </div>
        <div className="px-5 py-3">
          <dt className="text-xs text-muted-foreground">Purpose</dt>
          <dd className="mt-0.5">{row.purpose}</dd>
        </div>
      </dl>
      {actions.length ? (
        <div className="flex flex-wrap gap-2 border-t bg-muted/30 p-4">
          {actions.includes("approve") ? <Button disabled={actionsDisabled} onClick={() => onApprove(row)} size="sm" type="button">Approve</Button> : null}
          {actions.includes("checkout") ? <Button disabled={actionsDisabled} onClick={() => onCheckout(row)} size="sm" type="button">Check out</Button> : null}
          {actions.includes("return") ? <Button disabled={actionsDisabled} onClick={() => onReturn(row)} size="sm" type="button">Mark returned</Button> : null}
          {actions.includes("reject") ? <Button disabled={actionsDisabled} onClick={() => onReject(row)} size="sm" type="button" variant="outline">Reject</Button> : null}
          {actions.includes("cancel") ? <Button disabled={actionsDisabled} onClick={() => onCancel(row)} size="sm" type="button" variant="ghost">Cancel</Button> : null}
        </div>
      ) : (
        <p className="border-t bg-muted/30 px-5 py-3 text-xs text-muted-foreground">No workflow actions for this status.</p>
      )}
    </aside>
  );
}

function FilterSelect({
  children,
  id,
  label,
  onChange,
  value
}: {
  children: React.ReactNode;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="sr-only" htmlFor={id}>
        {label}
      </Label>
      <Select onValueChange={(next) => onChange(next === "all" ? "" : next)} value={value || "all"}>
        <SelectTrigger className="h-8 w-full lg:w-44" id={id} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function Legend({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-sm", className)} />
      {label}
      <span className="font-mono text-foreground tabular">{value}</span>
    </span>
  );
}
