import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutBorrowingByQrInputSchema,
  createBookingInputSchema,
  createDefectReportInputSchema,
  ensureTicketThreadInputSchema,
  regenerateAssetQrInputSchema,
  sendTicketMessageInputSchema,
  triageDefectReportInputSchema
} from "../dist/index.js";

const assetId = "8f4a8f90-9231-4ef0-b621-2c97af733001";
const bookingId = "8f4a8f90-9231-4ef0-b621-2c97af733002";
const defectReportId = "8f4a8f90-9231-4ef0-b621-2c97af733003";
const threadId = "8f4a8f90-9231-4ef0-b621-2c97af733004";

test("normalizes whitespace before sending text-heavy RPC inputs", () => {
  const bookingStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const bookingEnd = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  assert.deepEqual(regenerateAssetQrInputSchema.parse({
    p_asset_id: assetId,
    p_qr_code: "  ASSET-LT-001-7JQ2  "
  }), {
    p_asset_id: assetId,
    p_qr_code: "ASSET-LT-001-7JQ2"
  });

  assert.deepEqual(createBookingInputSchema.parse({
    p_asset_id: assetId,
    p_requested_start_at: bookingStart,
    p_requested_end_at: bookingEnd,
    p_purpose: "  Laboratory class session  "
  }), {
    p_asset_id: assetId,
    p_requested_start_at: bookingStart,
    p_requested_end_at: bookingEnd,
    p_purpose: "Laboratory class session"
  });

  assert.deepEqual(createDefectReportInputSchema.parse({
    p_asset_id: assetId,
    p_title: "  Keyboard issue  ",
    p_description: "  Several keys fail during laboratory use.  "
  }), {
    p_asset_id: assetId,
    p_title: "Keyboard issue",
    p_description: "Several keys fail during laboratory use."
  });

  assert.deepEqual(sendTicketMessageInputSchema.parse({
    p_thread_id: threadId,
    p_body: "  Please attach another photo.  "
  }), {
    p_thread_id: threadId,
    p_body: "Please attach another photo."
  });
});

test("normalizes optional nullable workflow notes to match backend null handling", () => {
  assert.equal(triageDefectReportInputSchema.safeParse({
    p_defect_report_id: defectReportId,
    p_status: "under_review"
  }).success, true);

  assert.equal(triageDefectReportInputSchema.safeParse({
    p_defect_report_id: defectReportId,
    p_status: "resolved",
    p_notes: null
  }).success, true);

  assert.deepEqual(triageDefectReportInputSchema.parse({
    p_defect_report_id: defectReportId,
    p_status: "sent_for_repair",
    p_notes: "  "
  }), {
    p_defect_report_id: defectReportId,
    p_status: "sent_for_repair",
    p_notes: null
  });

  assert.deepEqual(checkoutBorrowingByQrInputSchema.parse({
    p_qr_code: "  ASSET-LT-001-7JQ2  ",
    p_borrowing_id: bookingId,
    p_notes: "  "
  }), {
    p_qr_code: "ASSET-LT-001-7JQ2",
    p_borrowing_id: bookingId,
    p_notes: null
  });
});

test("requires ticket thread subject IDs to match the selected subject type exactly", () => {
  assert.equal(ensureTicketThreadInputSchema.safeParse({
    p_subject_type: "booking",
    p_booking_id: bookingId,
    p_defect_report_id: null
  }).success, true);

  assert.equal(ensureTicketThreadInputSchema.safeParse({
    p_subject_type: "defect_report",
    p_booking_id: null,
    p_defect_report_id: defectReportId
  }).success, true);

  assert.equal(ensureTicketThreadInputSchema.safeParse({
    p_subject_type: "booking",
    p_booking_id: bookingId,
    p_defect_report_id: defectReportId
  }).success, false);

  assert.equal(ensureTicketThreadInputSchema.safeParse({
    p_subject_type: "defect_report",
    p_booking_id: bookingId
  }).success, false);
});
