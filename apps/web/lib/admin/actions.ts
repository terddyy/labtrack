"use server";

import {
  bookingStatuses,
  reportTypes,
  userRoles as sharedUserRoles,
  type BookingStatus,
  type DefectStatus,
  type ReportType,
  type UserRole
} from "@labtrack/shared";
import {
  cancelBooking,
  checkoutBooking,
  createAsset,
  createCategory,
  createLocation,
  decideBooking,
  generateAssetQr,
  getAdminAccess,
  getAdminDashboardData,
  getBorrowingMonitor,
  getPrintableReportData,
  getTicketMessages,
  getUsageAnalytics,
  listActivityLogs,
  returnBooking,
  sendTicketMessage,
  triageDefectReport,
  updateProfileAccess
} from "./services";
import type {
  ActivityLogFilters,
  ActivityLogRow,
  AssetFormState,
  BorrowingMonitorFilters,
  BorrowingMonitorRow,
  DashboardData,
  PrintableReportFilters,
  PrintableReportRow,
  ProfileAccessUpdates,
  ProfileRow,
  ReportFilters,
  TicketMessageRow,
  UsageAnalyticsRow
} from "./types";

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defectTriageStatuses = new Set(["under_review", "sent_for_repair", "resolved", "rejected"]);
const validBookingStatuses = new Set<string>(bookingStatuses);
const validReportTypes = new Set<string>(reportTypes);
const userRoles = new Set<string>(sharedUserRoles);

export async function getAdminAccessAction() {
  return getAdminAccess();
}

export async function getAdminDashboardDataAction(): Promise<ActionResult<DashboardData>> {
  return toActionResult(() => getAdminDashboardData());
}

export async function getTicketMessagesAction(threadId: string | null): Promise<ActionResult<TicketMessageRow[]>> {
  return toActionResult(() => getTicketMessages(threadId ? parseId(threadId) : null));
}

export async function getBorrowingMonitorAction(input: BorrowingMonitorFilters): Promise<ActionResult<BorrowingMonitorRow[]>> {
  return toActionResult(() => getBorrowingMonitor(parseBorrowingMonitorFilters(input)));
}

export async function getUsageAnalyticsAction(input: ReportFilters): Promise<ActionResult<UsageAnalyticsRow[]>> {
  return toActionResult(() => getUsageAnalytics(parseReportFilters(input)));
}

export async function listActivityLogsAction(input: ActivityLogFilters): Promise<ActionResult<ActivityLogRow[]>> {
  return toActionResult(() => listActivityLogs(parseActivityLogFilters(input)));
}

export async function getPrintableReportDataAction(input: PrintableReportFilters): Promise<ActionResult<PrintableReportRow[]>> {
  return toActionResult(() => getPrintableReportData({
    ...parseReportFilters(input),
    reportType: parseReportType(input.reportType)
  }));
}

export async function createAssetAction(input: AssetFormState) {
  return toActionResult(() => createAsset(input));
}

export async function generateAssetQrAction(assetId: string) {
  return toActionResult(async () => {
    await generateAssetQr(parseId(assetId));
    return null;
  });
}

export async function decideBookingAction(bookingId: string, status: "approved" | "rejected") {
  return toActionResult(async () => {
    const parsedStatus = status === "approved" || status === "rejected" ? status : null;

    if (!parsedStatus) {
      throw new Error("Borrowing decision status is invalid.");
    }

    await decideBooking(parseId(bookingId), parsedStatus);
    return null;
  });
}

export async function checkoutBookingAction(bookingId: string) {
  return toActionResult(async () => {
    await checkoutBooking(parseId(bookingId));
    return null;
  });
}

export async function returnBookingAction(bookingId: string) {
  return toActionResult(async () => {
    await returnBooking(parseId(bookingId));
    return null;
  });
}

export async function cancelBookingAction(bookingId: string) {
  return toActionResult(async () => {
    await cancelBooking(parseId(bookingId));
    return null;
  });
}

export async function triageDefectReportAction(defectReportId: string, status: Exclude<DefectStatus, "pending">, label: string) {
  return toActionResult(async () => {
    const parsedStatus = parseDefectTriageStatus(status);
    await triageDefectReport(parseId(defectReportId), parsedStatus, label);
    return null;
  });
}

export async function updateProfileAccessAction(profile: ProfileRow, updates: ProfileAccessUpdates) {
  return toActionResult(async () => {
    await updateProfileAccess(parseId(profile.id), parseProfileAccessUpdates(updates));
    return null;
  });
}

export async function sendTicketMessageAction(threadId: string, body: string) {
  return toActionResult(async () => {
    const trimmedBody = body.trim();

    if (!trimmedBody || trimmedBody.length > 2000) {
      throw new Error("Message is invalid.");
    }

    await sendTicketMessage(parseId(threadId), trimmedBody);
    return null;
  });
}

export async function createCategoryAction(name: string) {
  return toActionResult(async () => {
    await createCategory(name);
    return null;
  });
}

export async function createLocationAction(name: string) {
  return toActionResult(async () => {
    await createLocation(name);
    return null;
  });
}

async function toActionResult<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { data: await action(), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "The request could not be completed." };
  }
}

function parseId(value: string) {
  if (!idPattern.test(value)) {
    throw new Error("Identifier is invalid.");
  }

  return value;
}

function parseOptionalId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return parseId(value);
}

function parseIsoDate(value: string, label: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${label} is invalid.`);
  }

  return date.toISOString();
}

function parseDateRange(value: { from: string; to: string }) {
  const from = parseIsoDate(value.from, "Start date");
  const to = parseIsoDate(value.to, "End date");

  if (new Date(to).getTime() <= new Date(from).getTime()) {
    throw new Error("End date must be after start date.");
  }

  return { from, to };
}

function parseBorrowingMonitorFilters(value: BorrowingMonitorFilters): BorrowingMonitorFilters {
  const range = parseDateRange(value);

  return {
    ...range,
    locationId: parseOptionalId(value.locationId),
    resourceId: parseOptionalId(value.resourceId),
    statuses: parseBookingStatusList(value.statuses)
  };
}

function parseReportFilters(value: ReportFilters): ReportFilters {
  const range = parseDateRange(value);

  return {
    ...range,
    locationId: parseOptionalId(value.locationId),
    assetId: parseOptionalId(value.assetId)
  };
}

function parseActivityLogFilters(value: ActivityLogFilters): ActivityLogFilters {
  return {
    from: value.from ? parseIsoDate(value.from, "Start date") : null,
    to: value.to ? parseIsoDate(value.to, "End date") : null,
    limit: parseLimit(value.limit),
    offset: parseOffset(value.offset)
  };
}

function parseBookingStatusList(value: BookingStatus[] | null | undefined): BookingStatus[] | null {
  if (!value?.length) {
    return null;
  }

  return value.map((status) => {
    if (!validBookingStatuses.has(status)) {
      throw new Error("Borrowing status filter is invalid.");
    }

    return status;
  });
}

function parseReportType(value: ReportType): ReportType {
  if (!validReportTypes.has(value)) {
    throw new Error("Report type is invalid.");
  }

  return value;
}

function parseLimit(value: number | undefined) {
  if (value === undefined) {
    return 100;
  }

  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new Error("Activity log limit is invalid.");
  }

  return value;
}

function parseOffset(value: number | undefined) {
  if (value === undefined) {
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Activity log offset is invalid.");
  }

  return value;
}

function parseDefectTriageStatus(value: string): Exclude<DefectStatus, "pending"> {
  if (!defectTriageStatuses.has(value)) {
    throw new Error("Defect status is invalid.");
  }

  return value as Exclude<DefectStatus, "pending">;
}

function parseProfileAccessUpdates(value: ProfileAccessUpdates): ProfileAccessUpdates {
  const updates: ProfileAccessUpdates = {};

  if (value.role !== undefined) {
    if (!userRoles.has(value.role)) {
      throw new Error("Profile role is invalid.");
    }

    updates.role = value.role as UserRole;
  }

  if (value.is_active !== undefined) {
    if (typeof value.is_active !== "boolean") {
      throw new Error("Profile active state is invalid.");
    }

    updates.is_active = value.is_active;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one access update is required.");
  }

  return updates;
}
