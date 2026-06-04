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
  getAvailabilityState,
  getRoleDisplayLabel,
  isActiveBookingStatus,
  isBorrowerRole,
  isCustodianRole,
  normalizeEmailDomain,
  isUniversityEmailAllowed,
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

test("role labels and university email checks are centralized", () => {
  assert.equal(getRoleDisplayLabel("admin"), "Custodian");
  assert.equal(getRoleDisplayLabel("custodian"), "Custodian");
  assert.equal(getRoleDisplayLabel("instructor"), "Faculty");
  assert.equal(getRoleDisplayLabel("faculty"), "Faculty");
  assert.equal(getRoleDisplayLabel("student"), "Student");
  assert.equal(isCustodianRole("super_admin"), true);
  assert.equal(isCustodianRole("faculty"), false);
  assert.equal(isBorrowerRole("student"), true);

  assert.equal(normalizeEmailDomain("  @PampangaStateU.edu.ph  "), "pampangastateu.edu.ph");
  assert.equal(isUniversityEmailAllowed("teacher@pampangastateu.edu.ph", ["pampangastateu.edu.ph"]), true);
  assert.equal(isUniversityEmailAllowed("teacher@pampangastateu.edu.ph", ["@PampangaStateU.edu.ph"]), true);
  assert.equal(isUniversityEmailAllowed("teacher@sub.pampangastateu.edu.ph", ["pampangastateu.edu.ph"]), false);
  assert.equal(isUniversityEmailAllowed("teacher@pampangastateu.edu.ph@example.com", ["example.com"]), false);
  assert.equal(isUniversityEmailAllowed("teacher@gmail.com", ["pampangastateu.edu.ph"]), false);
});

test("availability classification treats pending as tentative", () => {
  assert.equal(getAvailabilityState({}), "available");
  assert.equal(getAvailabilityState({ hasTentativeConflict: true }), "tentative");
  assert.equal(getAvailabilityState({ hasHardConflict: true, hasTentativeConflict: true }), "busy");
  assert.equal(getAvailabilityState({ isResourceActive: false }), "unavailable");
  assert.equal(getAvailabilityState({ isResourceArchived: true }), "unavailable");
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
