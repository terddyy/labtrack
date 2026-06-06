import assert from "node:assert/strict";
import test from "node:test";
import {
  assetSchema,
  backendRpcArgumentNames,
  backendRpcNames,
  buildQuickLoginAccounts,
  borrowerQrPickupRowDtoSchema,
  cancelBookingInputSchema,
  checkoutBorrowingByQrInputSchema,
  checkoutBookingInputSchema,
  createBookingInputSchema,
  createDefectReportInputSchema,
  createQrPayload,
  decideBookingInputSchema,
  ensureTicketThreadInputSchema,
  getBorrowerQrPickupInputSchema,
  isLabtrackQrPayload,
  listAdminAssetsInputSchema,
  markNotificationReadInputSchema,
  parseQrPayload,
  regenerateAssetQrInputSchema,
  resolveAssetByQrCodeInputSchema,
  returnBookingInputSchema,
  sendTicketMessageInputSchema,
  triageDefectReportInputSchema
} from "../dist/index.js";

test("creates and parses LABTRACK QR payloads", () => {
  const payload = createQrPayload("ASSET-LT-001-7JQ2");

  assert.equal(payload, "LABTRACK:v1:ASSET-LT-001-7JQ2");
  assert.deepEqual(parseQrPayload(payload), {
    version: "v1",
    code: "ASSET-LT-001-7JQ2"
  });
  assert.equal(isLabtrackQrPayload(payload), true);
});

test("rejects empty and foreign QR payloads", () => {
  assert.throws(() => createQrPayload("  "), /required/);
  assert.equal(parseQrPayload("OTHER:v1:ASSET-LT-001-7JQ2"), null);
  assert.equal(isLabtrackQrPayload("not a labtrack payload"), false);
});

test("rejects malformed QR payload encoding and segment counts", () => {
  assert.equal(parseQrPayload("LABTRACK:v1:%E0%A4%A"), null);
  assert.equal(isLabtrackQrPayload("LABTRACK:v1:%E0%A4%A"), false);
  assert.equal(parseQrPayload("LABTRACK:v1:ASSET-LT-001-7JQ2:extra"), null);
  assert.equal(parseQrPayload("LABTRACK:v1:%20%20"), null);
});

test("parses encoded QR code values with spaces and symbols", () => {
  const code = "ASSET LT/001 #A&B?";
  const payload = createQrPayload(code);

  assert.equal(payload, `LABTRACK:v1:${encodeURIComponent(code)}`);
  assert.deepEqual(parseQrPayload(payload), {
    version: "v1",
    code
  });
});

test("validates asset creation input shape", () => {
  const valid = assetSchema.safeParse({
    propertyNumber: "PSU-CCS-LT-001",
    serialNumber: null,
    name: "Lenovo ThinkPad Laboratory Laptop",
    categoryId: "8f4a8f90-9231-4ef0-b621-2c97af733001",
    locationId: "8f4a8f90-9231-4ef0-b621-2c97af733002",
    condition: "good",
    status: "available"
  });

  assert.equal(valid.success, true);
});

test("rejects incomplete asset creation input", () => {
  const invalid = assetSchema.safeParse({
    propertyNumber: "",
    name: "A",
    categoryId: "not-a-uuid",
    locationId: "",
    condition: "good",
    status: "available"
  });

  assert.equal(invalid.success, false);
});

test("exposes planned backend RPC names", () => {
  assert.deepEqual(backendRpcNames, {
    listAdminAssets: "list_admin_assets",
    resolveAssetByQrCode: "resolve_asset_by_qr_code",
    regenerateAssetQr: "regenerate_asset_qr",
    createBooking: "create_booking",
    cancelBooking: "cancel_booking",
    decideBooking: "decide_booking",
    checkoutBooking: "checkout_booking",
    returnBooking: "return_booking",
    listBorrowableResources: "list_borrowable_resources",
    listResourceSchedule: "list_resource_schedule",
    createBorrowing: "create_borrowing",
    cancelBorrowing: "cancel_borrowing",
    decideBorrowing: "decide_borrowing",
    checkoutBorrowing: "checkout_borrowing",
    getBorrowerQrPickup: "get_borrower_qr_pickup",
    checkoutBorrowingByQr: "checkout_borrowing_by_qr",
    returnBorrowing: "return_borrowing",
    getBorrowingMonitor: "get_borrowing_monitor",
    getUsageAnalytics: "get_usage_analytics",
    listActivityLogs: "list_activity_logs",
    getPrintableReportData: "get_printable_report_data",
    createDefectReport: "create_defect_report",
    triageDefectReport: "triage_defect_report",
    ensureTicketThread: "ensure_ticket_thread",
    sendTicketMessage: "send_ticket_message",
    markNotificationRead: "mark_notification_read"
  });
});

test("exposes planned backend RPC argument names", () => {
  assert.deepEqual(backendRpcArgumentNames, {
    listAdminAssets: ["p_limit", "p_offset"],
    resolveAssetByQrCode: ["p_qr_code"],
    regenerateAssetQr: ["p_asset_id", "p_qr_code"],
    createBooking: ["p_asset_id", "p_requested_start_at", "p_requested_end_at", "p_purpose"],
    cancelBooking: ["p_booking_id"],
    decideBooking: ["p_booking_id", "p_status", "p_notes"],
    checkoutBooking: ["p_booking_id", "p_notes"],
    returnBooking: ["p_booking_id", "p_notes"],
    listBorrowableResources: ["p_start_at", "p_end_at", "p_resource_type", "p_location_id", "p_query"],
    listResourceSchedule: ["p_resource_type", "p_resource_id", "p_from", "p_to"],
    createBorrowing: ["p_resource_type", "p_resource_id", "p_requested_start_at", "p_requested_end_at", "p_purpose"],
    cancelBorrowing: ["p_borrowing_id"],
    decideBorrowing: ["p_borrowing_id", "p_status", "p_notes"],
    checkoutBorrowing: ["p_borrowing_id", "p_notes"],
    getBorrowerQrPickup: ["p_qr_code"],
    checkoutBorrowingByQr: ["p_qr_code", "p_borrowing_id", "p_notes"],
    returnBorrowing: ["p_borrowing_id", "p_notes"],
    getBorrowingMonitor: ["p_from", "p_to", "p_location_id", "p_resource_id", "p_statuses"],
    getUsageAnalytics: ["p_from", "p_to", "p_location_id", "p_asset_id"],
    listActivityLogs: ["p_from", "p_to", "p_limit", "p_offset"],
    getPrintableReportData: ["p_report_type", "p_from", "p_to", "p_location_id", "p_asset_id"],
    createDefectReport: ["p_asset_id", "p_title", "p_description"],
    triageDefectReport: ["p_defect_report_id", "p_status", "p_notes"],
    ensureTicketThread: ["p_subject_type", "p_booking_id", "p_defect_report_id"],
    sendTicketMessage: ["p_thread_id", "p_body"],
    markNotificationRead: ["p_notification_id"]
  });
});

test("validates lifecycle RPC inputs", () => {
  const assetId = "8f4a8f90-9231-4ef0-b621-2c97af733001";
  const bookingId = "8f4a8f90-9231-4ef0-b621-2c97af733002";
  const defectReportId = "8f4a8f90-9231-4ef0-b621-2c97af733003";
  const threadId = "8f4a8f90-9231-4ef0-b621-2c97af733004";
  const notificationId = "8f4a8f90-9231-4ef0-b621-2c97af733005";
  const bookingStart = new Date(Date.now() + 60 * 60 * 1000);
  const bookingEnd = new Date(bookingStart.getTime() + 2 * 60 * 60 * 1000);

  assert.equal(resolveAssetByQrCodeInputSchema.safeParse({
    p_qr_code: "ASSET-LT-001-7JQ2"
  }).success, true);
  assert.equal(listAdminAssetsInputSchema.safeParse({
    p_limit: 100,
    p_offset: 0
  }).success, true);
  assert.equal(regenerateAssetQrInputSchema.safeParse({
    p_asset_id: assetId,
    p_qr_code: "ASSET-LT-001-7JQ2"
  }).success, true);
  assert.equal(createBookingInputSchema.safeParse({
    p_asset_id: assetId,
    p_requested_start_at: bookingStart.toISOString(),
    p_requested_end_at: bookingEnd.toISOString(),
    p_purpose: "Laboratory class session"
  }).success, true);
  assert.equal(cancelBookingInputSchema.safeParse({ p_booking_id: bookingId }).success, true);
  assert.equal(decideBookingInputSchema.safeParse({
    p_booking_id: bookingId,
    p_status: "approved",
    p_notes: null
  }).success, true);
  assert.equal(checkoutBookingInputSchema.safeParse({
    p_booking_id: bookingId,
    p_notes: "Released to instructor"
  }).success, true);
  assert.equal(getBorrowerQrPickupInputSchema.safeParse({
    p_qr_code: "ASSET-LT-001-7JQ2"
  }).success, true);
  assert.equal(checkoutBorrowingByQrInputSchema.safeParse({
    p_qr_code: "ASSET-LT-001-7JQ2",
    p_borrowing_id: bookingId,
    p_notes: "Borrower confirmed pickup"
  }).success, true);
  assert.equal(returnBookingInputSchema.safeParse({
    p_booking_id: bookingId,
    p_notes: null
  }).success, true);
  assert.equal(createDefectReportInputSchema.safeParse({
    p_asset_id: assetId,
    p_title: "Keyboard issue",
    p_description: "Several keys fail during laboratory use."
  }).success, true);
  assert.equal(triageDefectReportInputSchema.safeParse({
    p_defect_report_id: defectReportId,
    p_status: "sent_for_repair",
    p_notes: "Sent to vendor"
  }).success, true);
  assert.equal(ensureTicketThreadInputSchema.safeParse({
    p_subject_type: "defect_report",
    p_defect_report_id: defectReportId
  }).success, true);
  assert.equal(sendTicketMessageInputSchema.safeParse({
    p_thread_id: threadId,
    p_body: "Please attach another photo."
  }).success, true);
  assert.equal(markNotificationReadInputSchema.safeParse({
    p_notification_id: notificationId
  }).success, true);
});

test("rejects invalid lifecycle RPC inputs", () => {
  const assetId = "8f4a8f90-9231-4ef0-b621-2c97af733001";
  const bookingId = "8f4a8f90-9231-4ef0-b621-2c97af733002";
  const defectReportId = "8f4a8f90-9231-4ef0-b621-2c97af733003";
  const threadId = "8f4a8f90-9231-4ef0-b621-2c97af733004";
  const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const pastEnd = new Date(Date.now() - 60 * 60 * 1000);

  assert.equal(resolveAssetByQrCodeInputSchema.safeParse({
    p_qr_code: "   "
  }).success, false);
  assert.equal(listAdminAssetsInputSchema.safeParse({
    p_limit: 1000,
    p_offset: -1
  }).success, false);
  assert.equal(regenerateAssetQrInputSchema.safeParse({
    p_asset_id: assetId,
    p_qr_code: "   "
  }).success, false);
  assert.equal(createBookingInputSchema.safeParse({
    p_asset_id: assetId,
    p_requested_start_at: "2026-05-22T03:00:00.000Z",
    p_requested_end_at: "2026-05-22T01:00:00.000Z",
    p_purpose: "Laboratory class session"
  }).success, false);
  assert.equal(createBookingInputSchema.safeParse({
    p_asset_id: assetId,
    p_requested_start_at: pastStart.toISOString(),
    p_requested_end_at: pastEnd.toISOString(),
    p_purpose: "Laboratory class session"
  }).success, false);
  assert.equal(decideBookingInputSchema.safeParse({
    p_booking_id: bookingId,
    p_status: "checked_out"
  }).success, false);
  assert.equal(checkoutBorrowingByQrInputSchema.safeParse({
    p_qr_code: "   ",
    p_borrowing_id: bookingId,
    p_notes: null
  }).success, false);
  assert.equal(ensureTicketThreadInputSchema.safeParse({
    p_subject_type: "booking",
    p_defect_report_id: defectReportId
  }).success, false);
  assert.equal(sendTicketMessageInputSchema.safeParse({
    p_thread_id: threadId,
    p_body: "   "
  }).success, false);
  assert.equal(markNotificationReadInputSchema.safeParse({
    p_notification_id: "not-a-uuid"
  }).success, false);
});

test("validates borrower QR pickup return states", () => {
  const assetId = "8f4a8f90-9231-4ef0-b621-2c97af733001";
  const bookingId = "8f4a8f90-9231-4ef0-b621-2c97af733002";
  const borrowerId = "8f4a8f90-9231-4ef0-b621-2c97af733003";

  assert.equal(borrowerQrPickupRowDtoSchema.safeParse({
    state: "ready",
    borrowing_id: bookingId,
    asset_id: assetId,
    borrower_id: borrowerId,
    borrower_name: "Faculty Borrower",
    borrower_email: "faculty@pampangastateu.edu.ph",
    status: "approved",
    requested_start_at: "2026-06-05T08:00:00+00:00",
    requested_end_at: "2026-06-05T10:00:00+00:00",
    purpose: "Laboratory class session",
    message: "Your approved reservation is ready for pickup."
  }).success, true);

  assert.equal(borrowerQrPickupRowDtoSchema.safeParse({
    state: "walk_up",
    borrowing_id: null,
    asset_id: assetId,
    borrower_id: null,
    borrower_name: null,
    borrower_email: null,
    status: null,
    requested_start_at: null,
    requested_end_at: null,
    purpose: null,
    message: "Unsupported state."
  }).success, false);
});

test("builds default quick login accounts for requested roles", () => {
  assert.deepEqual(buildQuickLoginAccounts({}, { roles: ["super_admin", "admin", "instructor"] }), [
    {
      role: "super_admin",
      label: "Super admin login",
      email: "superadmin@pampangastateu.edu.ph",
      password: "demo123"
    },
    {
      role: "admin",
      label: "Custodian login",
      email: "custodian@pampangastateu.edu.ph",
      password: "demo123"
    },
    {
      role: "instructor",
      label: "Faculty login",
      email: "faculty@pampangastateu.edu.ph",
      password: "demo123"
    }
  ]);
});

test("overrides quick login accounts only when email and password are both provided", () => {
  assert.deepEqual(buildQuickLoginAccounts({
    admin: { email: "  lab-admin@example.edu  ", password: "  custom-secret  " },
    instructor: { email: "missing-password@example.edu" }
  }, { roles: ["admin", "instructor"] }), [
    {
      role: "admin",
      label: "Custodian login",
      email: "lab-admin@example.edu",
      password: "custom-secret"
    }
  ]);
});
