import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingDurationHours,
  bookingRequestSchema,
  createBookingRange,
  createDefaultBookingRange,
  isFutureBookingRange
} from "../dist/index.js";

const assetId = "8f4a8f90-9231-4ef0-b621-2c97af733001";

test("default booking start rounds to the next whole local hour", () => {
  const range = createDefaultBookingRange(new Date(2026, 4, 22, 9, 17, 42, 123));

  assert.equal(range.durationHours, 1);
  assert.equal(range.startAt.getFullYear(), 2026);
  assert.equal(range.startAt.getMonth(), 4);
  assert.equal(range.startAt.getDate(), 22);
  assert.equal(range.startAt.getHours(), 10);
  assert.equal(range.startAt.getMinutes(), 0);
  assert.equal(range.startAt.getSeconds(), 0);
  assert.equal(range.startAt.getMilliseconds(), 0);

  const exactHourRange = createDefaultBookingRange(new Date(2026, 4, 22, 9, 0, 0, 0));
  assert.equal(exactHourRange.startAt.getHours(), 10);
});

test("supported booking durations compute the correct end times", () => {
  const startAt = new Date(2026, 4, 22, 9, 30, 0, 0);

  assert.deepEqual(bookingDurationHours, [1, 2, 3]);

  for (const durationHours of bookingDurationHours) {
    const range = createBookingRange(startAt, durationHours);

    assert.equal(range.durationHours, durationHours);
    assert.equal(range.endAt.getTime(), startAt.getTime() + durationHours * 60 * 60 * 1000);
    assert.equal(range.requestedStartAt, range.startAt.toISOString());
    assert.equal(range.requestedEndAt, range.endAt.toISOString());
  }
});

test("past start times fail future booking validation", () => {
  const now = new Date(2026, 4, 22, 10, 0, 0, 0);
  const pastRange = createBookingRange(new Date(2026, 4, 22, 9, 0, 0, 0), 1);
  const currentRange = createBookingRange(now, 1);
  const futureRange = createBookingRange(new Date(2026, 4, 22, 11, 0, 0, 0), 1);

  assert.equal(isFutureBookingRange(pastRange, now), false);
  assert.equal(isFutureBookingRange(currentRange, now), false);
  assert.equal(isFutureBookingRange(futureRange, now), true);
});

test("generated booking ISO strings pass the booking request schema", () => {
  const range = createBookingRange(new Date(2026, 4, 22, 9, 0, 0, 0), 2);
  const validation = bookingRequestSchema.safeParse({
    assetId,
    requestedStartAt: range.requestedStartAt,
    requestedEndAt: range.requestedEndAt,
    purpose: "Laboratory class session"
  });

  assert.equal(validation.success, true);
});
