import assert from "node:assert/strict";
import test from "node:test";
import {
  formatStatusLabel,
  getBookingStatusTone,
  getBookingWorkflowActions,
  getDashboardCounters,
  getDefectStatusTone,
  getDefectTransitions,
  getDefectWorkflowActions,
  isActiveBookingStatus,
  isOpenDefectStatus,
  isTerminalBookingStatus,
  isTerminalDefectStatus
} from "../dist/index.js";

test("booking lifecycle helpers expose allowed admin actions", () => {
  assert.deepEqual(getBookingWorkflowActions("pending"), ["approve", "reject", "cancel"]);
  assert.deepEqual(getBookingWorkflowActions("approved"), ["checkout", "cancel"]);
  assert.deepEqual(getBookingWorkflowActions("checked_out"), ["return"]);
  assert.deepEqual(getBookingWorkflowActions("returned"), []);

  assert.equal(isActiveBookingStatus("pending"), true);
  assert.equal(isActiveBookingStatus("approved"), true);
  assert.equal(isActiveBookingStatus("checked_out"), true);
  assert.equal(isActiveBookingStatus("returned"), false);
  assert.equal(isTerminalBookingStatus("returned"), true);
});

test("defect lifecycle helpers mirror backend transition rules", () => {
  assert.deepEqual(getDefectTransitions("pending"), ["under_review", "sent_for_repair", "resolved", "rejected"]);
  assert.deepEqual(getDefectTransitions("under_review"), ["sent_for_repair", "resolved", "rejected"]);
  assert.deepEqual(getDefectTransitions("sent_for_repair"), ["resolved", "rejected"]);
  assert.deepEqual(getDefectTransitions("resolved"), []);

  assert.deepEqual(getDefectWorkflowActions("pending"), ["review", "send_for_repair", "resolve", "reject"]);
  assert.equal(isOpenDefectStatus("sent_for_repair"), true);
  assert.equal(isOpenDefectStatus("resolved"), false);
  assert.equal(isTerminalDefectStatus("rejected"), true);
});

test("status labels, tones, and counters are centralized", () => {
  assert.equal(formatStatusLabel("sent_for_repair"), "sent for repair");
  assert.equal(getBookingStatusTone("approved"), "success");
  assert.equal(getBookingStatusTone("cancelled"), "danger");
  assert.equal(getDefectStatusTone("resolved"), "success");
  assert.equal(getDefectStatusTone("pending"), "warning");

  assert.deepEqual(getDashboardCounters({
    assets: [{ activeQr: { code: "A" } }, { activeQr: null }],
    bookings: [{ status: "pending" }, { status: "returned" }, { status: "checked_out" }],
    defects: [{ status: "pending" }, { status: "resolved" }, { status: "sent_for_repair" }],
    notifications: [{ readAt: null }, { readAt: "2026-05-22T01:00:00+00:00" }]
  }), {
    activeBookings: 2,
    activeQrCodes: 1,
    openDefects: 2,
    pendingBookings: 1,
    registeredAssets: 2,
    unreadNotifications: 1
  });
});
