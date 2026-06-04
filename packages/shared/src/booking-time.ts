const hourInMilliseconds = 60 * 60 * 1000;

export const bookingDurationHours = [1, 2, 3] as const;

export type BookingDurationHours = (typeof bookingDurationHours)[number];

export type BookingRange = {
  startAt: Date;
  endAt: Date;
  durationHours: BookingDurationHours;
  requestedStartAt: string;
  requestedEndAt: string;
};

export function createDefaultBookingRange(now = new Date()) {
  assertValidDate(now, "Current time is invalid.");

  const startAt = new Date(now.getTime());
  startAt.setMinutes(0, 0, 0);
  startAt.setHours(startAt.getHours() + 1);

  return createBookingRange(startAt, 1);
}

export function createBookingRange(startAt: Date, durationHours: number) {
  assertValidDate(startAt, "Borrow start time is invalid.");

  const supportedDuration = toBookingDurationHours(durationHours);
  const normalizedStartAt = new Date(startAt.getTime());
  normalizedStartAt.setSeconds(0, 0);

  const endAt = new Date(normalizedStartAt.getTime() + supportedDuration * hourInMilliseconds);

  return {
    startAt: normalizedStartAt,
    endAt,
    durationHours: supportedDuration,
    requestedStartAt: normalizedStartAt.toISOString(),
    requestedEndAt: endAt.toISOString()
  };
}

export function isFutureBookingRange(range: Pick<BookingRange, "startAt" | "endAt">, now = new Date()) {
  assertValidDate(now, "Current time is invalid.");

  return range.startAt.getTime() > now.getTime() && range.endAt.getTime() > range.startAt.getTime();
}

export function formatBookingDateTime(date: Date) {
  assertValidDate(date, "Borrow date time is invalid.");

  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function toBookingDurationHours(durationHours: number) {
  if (bookingDurationHours.some((supportedDuration) => supportedDuration === durationHours)) {
    return durationHours as BookingDurationHours;
  }

  throw new RangeError("Borrow duration must be 1, 2, or 3 hours.");
}

function assertValidDate(date: Date, message: string) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new RangeError(message);
  }
}
