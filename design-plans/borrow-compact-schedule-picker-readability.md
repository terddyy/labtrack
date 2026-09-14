# Borrow compact schedule picker readability

Written against: 2ac2938f2d158f91b84b2f38a12edbf4b8483831

## Evidence chain

- Surface: `apps/mobile/app/(protected)/(tabs)/borrow.tsx` → `BookingSchedulePicker` with `compact` in `apps/mobile/components/booking-schedule-picker.tsx`
- Problem: On Borrow, the Date and Start time controls truncate (`Wed, Jul …`, `12:1…`) while a second summary row repeats the same range in full, crowding the top card without adding scannable value.
- Design evidence: `MOBILE-PAGES.md` Borrow schedule panel specifies readable date picker row + start time picker row + duration chips; global density is "Comfortable spacing". Rendered screenshot shows unreadable truncated picker values.
- Owner: `apps/mobile/components/booking-schedule-picker.tsx` (`PickerRow`, compact branch, `summaryCompact`)
- Scope and affected surfaces: Borrow tab (`borrow.tsx`, `compact` prop). Asset borrow form uses non-compact picker and is out of scope.
- Uncertainty: none

## Design decision

In compact mode, optimize for half-width picker rows that must remain tappable and fully readable, and drop the redundant full-range summary because date, start time, and duration chips already express the booking window.

## Reuse

- `formatPickerDate`, `formatPickerTime`, `formatDurationCompact` in `booking-schedule-picker.tsx`
- `PickerRow` / `pickerRowCompact` / `pickerRowsCompact` layout primitives
- `typography.caption`, `colors.muted`, `colors.text` from `constants/theme.ts`
- Exemplar: non-compact `SummaryLine` layout in the same file (full-width labeled rows)

## Changes

1. `apps/mobile/components/booking-schedule-picker.tsx`
   - Change: Add compact-specific formatters for picker row values (e.g. date `Jul 22` without weekday/year; time unchanged). Stack compact date/time rows vertically (`pickerRowsCompact` → column, each row full width) so values are not squeezed into ~50% width. Remove the `summaryCompact` block when compact picker rows are shown.
   - Preserve: Duration chips, inline iOS picker behavior, validation notice, non-compact mode unchanged.
   - Verify: Borrow screen shows full date and time in both picker rows; no duplicate long range string below duration chips.

## Scope

- Inherit: Borrow tab schedule header
- Verify: Borrow tab at narrow widths (320–390dp); asset `[payload]` borrow form still uses non-compact picker unchanged
- Exclude: Changing `formatBookingDateTime` in `packages/shared`; redesigning duration chip layout

## Validation

- Product: Open Borrow → confirm selected date and start time are fully legible without tapping; duration selection still updates availability list.
- Interface: Borrow tab, compact schedule card, all four duration chips, long locale strings (weekday + 12-hour time).
- System: No new component; compact branch stays inside `BookingSchedulePicker`.
- Repository: `pnpm --filter mobile exec tsc --noEmit` → no type errors

## Stop conditions

- Stop if stacking compact rows causes the schedule block to exceed one screen above resources on 320dp devices; in that case keep side-by-side rows but only with shortened compact formatters and no summary row.

## Design documentation

- After acceptance and validation: note in `apps/mobile/MOBILE-PAGES.md` Borrow schedule panel that compact Borrow uses stacked date/time rows without a duplicate summary line.
