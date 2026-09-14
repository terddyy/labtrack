import type { BookingStatus } from "@labtrack/shared";
import type { CSSProperties } from "react";

import type { AssetView, BorrowingMonitorRow, LocationRow } from "@/lib/admin/types";

export type CalendarDay = {
  date: Date;
  events: CalendarLaneEvent[];
  key: string;
};

type CalendarEventSegment = {
  endMinutes: number;
  row: BorrowingMonitorRow;
  startMinutes: number;
};

export type CalendarLaneEvent = CalendarEventSegment & {
  laneCount: number;
  laneIndex: number;
};

export const slotHeightPx = 28;
const defaultVisibleStartHour = 7;
const defaultVisibleEndHour = 19;

export function buildCalendarDays(rows: BorrowingMonitorRow[], weekStart: Date): CalendarDay[] {
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

export function assignLanes(events: CalendarEventSegment[]): CalendarLaneEvent[] {
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

export function assignGroupLanes(group: CalendarEventSegment[]): CalendarLaneEvent[] {
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

export function getEventStyle(event: CalendarLaneEvent, visibleStartHour: number): CSSProperties {
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

export function getVisibleWindow(rows: BorrowingMonitorRow[], weekStart: Date) {
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

export function buildTimeSlots(startHour: number, endHour: number) {
  const slots: number[] = [];

  for (let minutes = startHour * 60; minutes < endHour * 60; minutes += 30) {
    slots.push(minutes);
  }

  return slots;
}

export function summarizeRows(rows: BorrowingMonitorRow[]) {
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

export function createWeekRange(date: Date) {
  const from = startOfWeek(date);
  const to = addDays(from, 7);

  return { from, to };
}

export function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + mondayOffset);

  return next;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);

  return next;
}

export function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

export function parseDate(value: string) {
  const date = new Date(value);

  return value && !Number.isNaN(date.getTime()) ? date : null;
}

export function minutesSinceStartOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function roundDownToHour(minutes: number) {
  return Math.floor(minutes / 60) * 60;
}

export function roundUpToHour(minutes: number) {
  return Math.ceil(minutes / 60) * 60;
}

export function toDateTimeLocalInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

export function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function formatWeekLabel(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);

  return `${weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} - ${weekEnd.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function formatAgendaHeading(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    weekday: "long"
  });
}

export function formatTimeFromMinutes(minutes: number) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatTimeRange(from: string, to: string) {
  return `${formatTime(from)} - ${formatTime(to)}`;
}

export function formatResource(row: BorrowingMonitorRow, assets: AssetView[], locations: LocationRow[]) {
  if (row.resource_type === "room" && row.room_id) {
    return locations.find((location) => location.id === row.room_id)?.name ?? "Unknown room";
  }

  if (row.asset_id) {
    return assets.find((asset) => asset.id === row.asset_id)?.name ?? "Unknown equipment";
  }

  return "Unknown resource";
}

export function getConflictLabel(status: BookingStatus) {
  if (status === "pending") {
    return "Tentative";
  }

  if (status === "approved" || status === "checked_out") {
    return "Unavailable";
  }

  return "Closed";
}
