import assert from "node:assert/strict";
import test from "node:test";
import { createBookingRange, getBorrowSubmitEligibility } from "../dist/index.js";

const futureStart = new Date(Date.now() + 60 * 60 * 1000);
const pastStart = new Date(Date.now() - 60 * 60 * 1000);
const now = new Date();

test("borrow submit eligibility accepts a valid future request", () => {
  const range = createBookingRange(futureStart, 90);
  const result = getBorrowSubmitEligibility({
    availability: "available",
    now,
    purpose: "Lab class session",
    range
  });

  assert.deepEqual(result, { canSubmit: true });
});

test("borrow submit eligibility accepts tentative availability", () => {
  const range = createBookingRange(futureStart, 90);
  const result = getBorrowSubmitEligibility({
    availability: "tentative",
    now,
    purpose: "Lab class session",
    range
  });

  assert.equal(result.canSubmit, true);
});

test("borrow submit eligibility blocks short purpose", () => {
  const range = createBookingRange(futureStart, 90);
  const result = getBorrowSubmitEligibility({
    availability: "available",
    now,
    purpose: "lab",
    range
  });

  assert.equal(result.canSubmit, false);
  assert.match(result.reason, /at least 5 characters/i);
});

test("borrow submit eligibility blocks whitespace-only purpose under five chars", () => {
  const range = createBookingRange(futureStart, 90);
  const result = getBorrowSubmitEligibility({
    availability: "available",
    now,
    purpose: "  ab  ",
    range
  });

  assert.equal(result.canSubmit, false);
  assert.match(result.reason, /at least 5 characters/i);
});

test("borrow submit eligibility blocks busy resources", () => {
  const range = createBookingRange(futureStart, 90);
  const result = getBorrowSubmitEligibility({
    availability: "busy",
    now,
    purpose: "Lab class session",
    range
  });

  assert.equal(result.canSubmit, false);
  assert.match(result.reason, /not available/i);
});

test("borrow submit eligibility blocks unavailable resources", () => {
  const range = createBookingRange(futureStart, 90);
  const result = getBorrowSubmitEligibility({
    availability: "unavailable",
    now,
    purpose: "Lab class session",
    range
  });

  assert.equal(result.canSubmit, false);
  assert.match(result.reason, /not available/i);
});

test("borrow submit eligibility blocks past schedules", () => {
  const range = createBookingRange(pastStart, 90);
  const result = getBorrowSubmitEligibility({
    availability: "available",
    now,
    purpose: "Lab class session",
    range
  });

  assert.equal(result.canSubmit, false);
  assert.match(result.reason, /later than now/i);
});

test("borrow submit eligibility blocks schedules that start exactly now", () => {
  const range = createBookingRange(now, 90);
  const result = getBorrowSubmitEligibility({
    availability: "available",
    now,
    purpose: "Lab class session",
    range
  });

  assert.equal(result.canSubmit, false);
  assert.match(result.reason, /later than now/i);
});
