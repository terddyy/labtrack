const minuteInMilliseconds = 60 * 1000;

export const borrowingDurationMinutes = [90, 120, 150, 180] as const;
export const bookingDurationHours = [1.5, 2, 2.5, 3] as const;

export type BookingDurationHours = (typeof bookingDurationHours)[number];
export type BorrowingDurationMinutes = (typeof borrowingDurationMinutes)[number];

export type BookingRange = {
  startAt: Date;
  endAt: Date;
  durationHours: BookingDurationHours;
  durationMinutes: BorrowingDurationMinutes;
  requestedStartAt: string;
  requestedEndAt: string;
};

export function createDefaultBookingRange(now = new Date()) {
  assertValidDate(now, "Current time is invalid.");

  const startAt = new Date(now.getTime());
  startAt.setMinutes(0, 0, 0);
  startAt.setHours(startAt.getHours() + 1);

  return createBookingRange(startAt, 90);
}

export function createBookingRange(startAt: Date, duration: number) {
  assertValidDate(startAt, "Borrow start time is invalid.");

  const supportedDurationMinutes = toBorrowingDurationMinutes(duration);
  const supportedDurationHours = (supportedDurationMinutes / 60) as BookingDurationHours;
  const normalizedStartAt = new Date(startAt.getTime());
  normalizedStartAt.setSeconds(0, 0);

  const endAt = new Date(normalizedStartAt.getTime() + supportedDurationMinutes * minuteInMilliseconds);

  return {
    startAt: normalizedStartAt,
    endAt,
    durationHours: supportedDurationHours,
    durationMinutes: supportedDurationMinutes,
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

function toBorrowingDurationMinutes(duration: number) {
  const durationMinutes = duration <= 4 ? duration * 60 : duration;

  if (borrowingDurationMinutes.some((supportedDuration) => supportedDuration === durationMinutes)) {
    return durationMinutes as BorrowingDurationMinutes;
  }

  throw new RangeError("Borrow duration must be 90, 120, 150, or 180 minutes.");
}

function assertValidDate(date: Date, message: string) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new RangeError(message);
  }
}
