"use client";

import {
  formatStatusLabel,
  getBookingWorkflowActions,
  type BookingStatus
} from "@labtrack/shared";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { EmptyState, Notice, StatusBadge } from "@/components/admin/ui";
import type {
  AssetView,
  BorrowingMonitorRow,
  LocationRow
} from "@/lib/admin/types";

export type BorrowingCalendarStatusFilter = "all" | BookingStatus;
export type BorrowingCalendarFilters = {
  from: string;
  to: string;
  locationId: string;
  resourceId: string;
  status: BorrowingCalendarStatusFilter;
};
export type BorrowingCalendarActionTarget = Pick<BorrowingMonitorRow, "id" | "status">;

type CalendarDay = {
  date: Date;
  events: CalendarLaneEvent[];
  key: string;
};

type CalendarEventSegment = {
  endMinutes: number;
  row: BorrowingMonitorRow;
  startMinutes: number;
};

type CalendarLaneEvent = CalendarEventSegment & {
  laneCount: number;
  laneIndex: number;
};

const monitorStatusOptions: BorrowingCalendarStatusFilter[] = ["all", "pending", "approved", "checked_out", "returned", "cancelled", "rejected"];
const slotHeightPx = 28;
const defaultVisibleStartHour = 7;
const defaultVisibleEndHour = 19;

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
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? null;
  const selectedActions = selectedRow ? getBookingWorkflowActions(selectedRow.status) : [];
  const contentHeight = timeSlots.length * slotHeightPx;
  const summary = useMemo(() => summarizeRows(rows), [rows]);

  useEffect(() => {
    if (selectedRowId && !rows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(null);
    }
  }, [rows, selectedRowId]);

  function handleWeekChange(nextWeekStart: Date) {
    const range = createWeekRange(nextWeekStart);
    onChangeFilters({
      ...filters,
      from: toDateTimeLocalInput(range.from),
      to: toDateTimeLocalInput(range.to)
    });
  }

  function handleFilterChange(updates: Partial<Pick<BorrowingCalendarFilters, "locationId" | "resourceId" | "status">>) {
    onChangeFilters({ ...filters, ...updates });
  }

  return (
    <section className="borrowing-calendar-layout">
      <div className="panel borrowing-calendar-panel">
        <div className="panel-header calendar-toolbar">
          <div>
            <p className="eyebrow">Borrowing Calendar</p>
            <h2>{formatWeekLabel(weekStart)}</h2>
            <p className="muted">Week view for room and equipment reservations.</p>
          </div>
          <div className="calendar-toolbar-actions">
            <button aria-label="Previous week" className="button secondary" disabled={disabled} onClick={() => handleWeekChange(addDays(weekStart, -7))} type="button">
              <ChevronLeft size={15} />
            </button>
            <button className="button secondary" disabled={disabled} onClick={() => handleWeekChange(new Date())} type="button">
              <CalendarDays size={15} />
              Today
            </button>
            <button aria-label="Next week" className="button secondary" disabled={disabled} onClick={() => handleWeekChange(addDays(weekStart, 7))} type="button">
              <ChevronRight size={15} />
            </button>
            <button className="button secondary" disabled={disabled} onClick={onRefresh} type="button">
              <RefreshCw size={15} />
              {disabled ? "Loading" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="panel-body calendar-controls">
          <div className="calendar-summary">
            <SummaryPill label="Visible" value={summary.total.toString()} />
            <SummaryPill label="Tentative" value={summary.pending.toString()} />
            <SummaryPill label="Blocking" value={summary.blocking.toString()} />
            <SummaryPill label="Closed" value={summary.closed.toString()} />
          </div>

          <div className="calendar-filter-grid">
            <div className="field">
              <label htmlFor="monitor-location">Room/Lab</label>
              <select id="monitor-location" onChange={(event) => handleFilterChange({ locationId: event.target.value })} value={filters.locationId}>
                <option value="">All rooms and labs</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="monitor-resource">Resource</label>
              <select id="monitor-resource" onChange={(event) => handleFilterChange({ resourceId: event.target.value })} value={filters.resourceId}>
                <option value="">All resources</option>
                {locations.map((location) => (
                  <option key={`room-${location.id}`} value={location.id}>Room: {location.name}</option>
                ))}
                {assets.map((asset) => (
                  <option key={`asset-${asset.id}`} value={asset.id}>Equipment: {asset.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="monitor-status">Status</label>
              <select id="monitor-status" onChange={(event) => handleFilterChange({ status: event.target.value as BorrowingCalendarStatusFilter })} value={filters.status}>
                {monitorStatusOptions.map((status) => (
                  <option key={status} value={status}>{status === "all" ? "All statuses" : formatStatusLabel(status)}</option>
                ))}
              </select>
            </div>
          </div>

          {message ? <Notice tone="warning">{message}</Notice> : null}
        </div>

        <div className="calendar-week-scroller">
          <div className="calendar-week-grid">
            <div className="calendar-time-axis">
              <div className="calendar-day-heading calendar-time-heading">Time</div>
              <div className="calendar-slot-stack" style={{ height: contentHeight }}>
                {timeSlots.map((minutes) => (
                  <div className="calendar-time-label" key={minutes}>
                    {minutes % 60 === 0 ? formatTimeFromMinutes(minutes) : ""}
                  </div>
                ))}
              </div>
            </div>

            {days.map((day) => (
              <section className="calendar-day-column" key={day.key}>
                <div className="calendar-day-heading">
                  <span>{formatWeekday(day.date)}</span>
                  <strong>{formatDayNumber(day.date)}</strong>
                </div>
                <div className="calendar-day-slots" style={{ height: contentHeight }}>
                  {timeSlots.map((minutes) => (
                    <div className="calendar-grid-line" key={`${day.key}-${minutes}`} />
                  ))}
                  {day.events.map((event) => (
                    <button
                      aria-pressed={selectedRowId === event.row.id}
                      className={`calendar-event is-${event.row.status}`}
                      key={`${day.key}-${event.row.id}`}
                      onClick={() => setSelectedRowId(event.row.id)}
                      style={getEventStyle(event, visibleWindow.startHour)}
                      type="button"
                    >
                      <span className="calendar-event-time">{formatTimeRange(event.row.requested_start_at, event.row.requested_end_at)}</span>
                      <strong>{formatResource(event.row, assets, locations)}</strong>
                      <span>{event.row.borrower_name ?? event.row.borrower_email ?? "Unknown borrower"}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="calendar-agenda">
          {days.map((day) => (
            <section className="calendar-agenda-day" key={`agenda-${day.key}`}>
              <div className="topbar compact">
                <h3>{formatAgendaHeading(day.date)}</h3>
                <span className="badge neutral">{day.events.length}</span>
              </div>
              {day.events.length ? day.events.map((event) => (
                <button
                  aria-pressed={selectedRowId === event.row.id}
                  className={`calendar-agenda-item is-${event.row.status}`}
                  key={`agenda-${day.key}-${event.row.id}`}
                  onClick={() => setSelectedRowId(event.row.id)}
                  type="button"
                >
                  <span className="calendar-event-time">{formatTimeRange(event.row.requested_start_at, event.row.requested_end_at)}</span>
                  <strong>{formatResource(event.row, assets, locations)}</strong>
                  <span>{event.row.borrower_name ?? event.row.borrower_email ?? "Unknown borrower"}</span>
                  <StatusBadge status={event.row.status} />
                </button>
              )) : <p className="muted">No borrowing schedules.</p>}
            </section>
          ))}
        </div>

        {!rows.length ? <EmptyState label={disabled ? "Loading borrowing schedules." : "No borrowing schedules found for this week."} /> : null}
      </div>

      <aside className="panel calendar-detail-panel">
        <div className="panel-header">
          <div>
            <h2>Booking details</h2>
            <p className="muted">{selectedRow ? "Review schedule and run workflow actions." : "Select a calendar block."}</p>
          </div>
        </div>
        <div className="panel-body calendar-detail-body">
          {selectedRow ? (
            <>
              <div className="calendar-detail-title">
                <div>
                  <p className="eyebrow">{selectedRow.resource_type === "room" ? "Room" : "Equipment"}</p>
                  <h3>{formatResource(selectedRow, assets, locations)}</h3>
                </div>
                <StatusBadge status={selectedRow.status} />
              </div>

              <div className="calendar-detail-meta">
                <DetailRow label="Borrower" value={selectedRow.borrower_name ?? selectedRow.borrower_email ?? "Unknown borrower"} />
                <DetailRow label="Schedule" value={`${formatDateTime(selectedRow.requested_start_at)} - ${formatDateTime(selectedRow.requested_end_at)}`} />
                <DetailRow label="Availability" value={getConflictLabel(selectedRow.status)} tone={getConflictTone(selectedRow.status)} />
                <DetailRow label="Purpose" value={selectedRow.purpose} />
              </div>

              {selectedActions.length ? (
                <div className="calendar-detail-actions">
                  {selectedActions.includes("approve") ? <button className="button primary" disabled={actionsDisabled} onClick={() => onApprove(selectedRow)} type="button">Approve</button> : null}
                  {selectedActions.includes("reject") ? <button className="button secondary" disabled={actionsDisabled} onClick={() => onReject(selectedRow)} type="button">Reject</button> : null}
                  {selectedActions.includes("checkout") ? <button className="button primary" disabled={actionsDisabled} onClick={() => onCheckout(selectedRow)} type="button">Check out</button> : null}
                  {selectedActions.includes("return") ? <button className="button primary" disabled={actionsDisabled} onClick={() => onReturn(selectedRow)} type="button">Return</button> : null}
                  {selectedActions.includes("cancel") ? <button className="button secondary" disabled={actionsDisabled} onClick={() => onCancel(selectedRow)} type="button">Cancel</button> : null}
                </div>
              ) : <Notice tone="neutral">No workflow actions are available for this booking status.</Notice>}
            </>
          ) : (
            <div className="calendar-detail-empty">
              <Clock size={28} />
              <p className="muted">Click a booking block in the calendar to see borrower, resource, purpose, and actions.</p>
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="calendar-summary-pill">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, tone, value }: { label: string; tone?: "danger" | "success" | "warning"; value: string }) {
  return (
    <div className="calendar-detail-row">
      <span className="muted">{label}</span>
      {tone ? <span className={`badge ${tone}`}>{value}</span> : <strong>{value}</strong>}
    </div>
  );
}

function buildCalendarDays(rows: BorrowingMonitorRow[], weekStart: Date): CalendarDay[] {
  return getWeekDays(weekStart).map((date) => {
    const dayStart = startOfDay(date);
    const dayEnd = addDays(dayStart, 1);
    const events = rows.flatMap((row): CalendarEventSegment[] => {
      const start = parseDate(row.requested_start_at);
      const end = parseDate(row.requested_end_at);

      if (!start || !end || end <= dayStart || start >= dayEnd) {
        return [];
      }

      const segmentStart = start > dayStart ? start : dayStart;
      const segmentEnd = end < dayEnd ? end : dayEnd;

      return [{
        endMinutes: minutesSinceStartOfDay(segmentEnd),
        row,
        startMinutes: minutesSinceStartOfDay(segmentStart)
      }];
    });

    return {
      date,
      events: assignLanes(events),
      key: formatDateKey(date)
    };
  });
}

function assignLanes(events: CalendarEventSegment[]): CalendarLaneEvent[] {
  const sorted = [...events].sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);
  const groups: CalendarEventSegment[][] = [];
  let group: CalendarEventSegment[] = [];
  let groupEnd = 0;

  for (const event of sorted) {
    if (!group.length || event.startMinutes < groupEnd) {
      group.push(event);
      groupEnd = Math.max(groupEnd, event.endMinutes);
      continue;
    }

    groups.push(group);
    group = [event];
    groupEnd = event.endMinutes;
  }

  if (group.length) {
    groups.push(group);
  }

  return groups.flatMap(assignGroupLanes);
}

function assignGroupLanes(group: CalendarEventSegment[]): CalendarLaneEvent[] {
  const laneEnds: number[] = [];
  const assigned = group.map((event) => {
    const availableLane = laneEnds.findIndex((endMinutes) => endMinutes <= event.startMinutes);
    const laneIndex = availableLane === -1 ? laneEnds.length : availableLane;
    laneEnds[laneIndex] = event.endMinutes;

    return {
      ...event,
      laneCount: 1,
      laneIndex
    };
  });
  const laneCount = Math.max(1, laneEnds.length);

  return assigned.map((event) => ({ ...event, laneCount }));
}

function getEventStyle(event: CalendarLaneEvent, visibleStartHour: number): CSSProperties {
  const visibleStartMinutes = visibleStartHour * 60;
  const top = Math.max(0, ((event.startMinutes - visibleStartMinutes) / 30) * slotHeightPx);
  const height = Math.max(28, ((event.endMinutes - event.startMinutes) / 30) * slotHeightPx - 4);
  const laneWidth = 100 / event.laneCount;

  return {
    height,
    left: `calc(${event.laneIndex * laneWidth}% + 3px)`,
    top,
    width: `calc(${laneWidth}% - 6px)`
  };
}

function getVisibleWindow(rows: BorrowingMonitorRow[], weekStart: Date) {
  const weekEnd = addDays(weekStart, 7);
  let startMinutes = defaultVisibleStartHour * 60;
  let endMinutes = defaultVisibleEndHour * 60;

  for (const row of rows) {
    const start = parseDate(row.requested_start_at);
    const end = parseDate(row.requested_end_at);

    if (!start || !end || end <= weekStart || start >= weekEnd) {
      continue;
    }

    startMinutes = Math.min(startMinutes, roundDownToHour(minutesSinceStartOfDay(start)));
    endMinutes = Math.max(endMinutes, roundUpToHour(minutesSinceStartOfDay(end)));
  }

  return {
    endHour: Math.min(24, Math.max(defaultVisibleEndHour, Math.ceil(endMinutes / 60))),
    startHour: Math.max(0, Math.min(defaultVisibleStartHour, Math.floor(startMinutes / 60)))
  };
}

function buildTimeSlots(startHour: number, endHour: number) {
  const slots: number[] = [];

  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += 30) {
    slots.push(minutes);
  }

  return slots;
}

function summarizeRows(rows: BorrowingMonitorRow[]) {
  return rows.reduce((summary, row) => {
    summary.total += 1;

    if (row.status === "pending") {
      summary.pending += 1;
    } else if (row.status === "approved" || row.status === "checked_out") {
      summary.blocking += 1;
    } else {
      summary.closed += 1;
    }

    return summary;
  }, { blocking: 0, closed: 0, pending: 0, total: 0 });
}

function createWeekRange(date: Date) {
  const from = startOfWeek(date);
  const to = addDays(from, 7);

  return { from, to };
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + mondayOffset);

  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function parseDate(value: string) {
  const date = new Date(value);

  return value && !Number.isNaN(date.getTime()) ? date : null;
}

function minutesSinceStartOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function roundDownToHour(minutes: number) {
  return Math.floor(minutes / 60) * 60;
}

function roundUpToHour(minutes: number) {
  return Math.ceil(minutes / 60) * 60;
}

function toDateTimeLocalInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatWeekLabel(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);

  return `${weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} - ${weekEnd.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function formatDayNumber(date: Date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatAgendaHeading(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    weekday: "long"
  });
}

function formatTimeFromMinutes(minutes: number) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatTimeRange(from: string, to: string) {
  return `${formatTime(from)} - ${formatTime(to)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatResource(row: BorrowingMonitorRow, assets: AssetView[], locations: LocationRow[]) {
  if (row.resource_type === "room" && row.room_id) {
    return locations.find((location) => location.id === row.room_id)?.name ?? "Unknown room";
  }

  if (row.asset_id) {
    return assets.find((asset) => asset.id === row.asset_id)?.name ?? "Unknown equipment";
  }

  return "Unknown resource";
}

function getConflictLabel(status: BookingStatus) {
  if (status === "pending") {
    return "Tentative";
  }

  if (status === "approved" || status === "checked_out") {
    return "Unavailable";
  }

  return "Closed";
}

function getConflictTone(status: BookingStatus) {
  if (status === "pending") {
    return "warning";
  }

  if (status === "approved" || status === "checked_out") {
    return "danger";
  }

  return "success";
}
