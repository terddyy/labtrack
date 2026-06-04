"use server";

import type { DefectStatus, UserRole } from "@labtrack/shared";
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
  getTicketMessages,
  returnBooking,
  sendTicketMessage,
  triageDefectReport,
  updateProfileAccess
} from "./services";
import type { AssetFormState, DashboardData, ProfileAccessUpdates, ProfileRow, TicketMessageRow } from "./types";

type ActionResult<T> = { data: T; error: null } | { data: null; error: string };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defectTriageStatuses = new Set(["under_review", "sent_for_repair", "resolved", "rejected"]);
const userRoles = new Set(["instructor", "admin", "super_admin"]);

export async function getAdminAccessAction() {
  return getAdminAccess();
}

export async function getAdminDashboardDataAction(): Promise<ActionResult<DashboardData>> {
  return toActionResult(() => getAdminDashboardData());
}

export async function getTicketMessagesAction(threadId: string | null): Promise<ActionResult<TicketMessageRow[]>> {
  return toActionResult(() => getTicketMessages(threadId ? parseId(threadId) : null));
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
      throw new Error("Booking decision status is invalid.");
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
