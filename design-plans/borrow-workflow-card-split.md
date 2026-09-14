# Borrow workflow card split

Written against: 2ac2938f2d158f91b84b2f38a12edbf4b8483831

## Evidence chain

- Surface: `apps/mobile/app/(protected)/(tabs)/borrow.tsx` → `workflowCard`
- Problem: Toolbar, schedule picker, filter chips, and search field share one glass card, producing a tall, dense control block before the resource list (rendered screenshot).
- Design evidence: `MOBILE-PAGES.md` Borrow layout sections 1–3 describe separate panels (hero/toolbar, schedule, browse resources) with `spacing.gap` between cards; global "Comfortable spacing; scrollable pages with generous padding".
- Owner: `borrow.tsx` (`workflowCard`, `toolbarRow`, `filterRow`, `searchField`)
- Scope and affected surfaces: Borrow tab header area only
- Uncertainty: Hero mint card from docs is not implemented; this plan splits schedule vs browse only, not a new hero.

## Design decision

Separate scheduling controls from resource discovery controls into two `Card` siblings so users can scan "when" vs "what" without one monolithic header.

## Reuse

- `Card`, `SectionTitle`, `Field`, `Button` from `components/ui.tsx`
- `BookingSchedulePicker` (compact) unchanged after schedule-picker readability plan
- `FilterChip` and `resourceFilters` in `borrow.tsx`
- `spacing.gap` between screen children via `ScreenScrollView` / `screenInner`
- Exemplar: History `sectionBlock` + separate cards pattern lower on the same screen

## Changes

1. `apps/mobile/app/(protected)/(tabs)/borrow.tsx`
   - Change: Replace single `workflowCard` with:
     - **Toolbar card** (or top row): title "Borrow", resource count caption, Refresh button only.
     - **Schedule card**: `SectionTitle` title "Schedule", caption "Borrowing limited to 1.5–3 hours", `BookingSchedulePicker compact`.
     - **Browse card**: `SectionTitle` title "Browse resources", filter chips, search `Field`.
   - Preserve: All browser hook wiring, filter/search behavior, error/success notices placement (below cards), resource list order.
   - Verify: Three distinct glass cards with `spacing.gap` between them; resource list starts higher cognitively after shorter browse card.

2. `apps/mobile/app/(protected)/(tabs)/borrow.tsx` styles
   - Change: Remove or repurpose `workflowCard`; add minimal `scheduleCard` / `browseCard` padding consistent with `panelCard` (`gap: 10`, `padding: 14`).
   - Preserve: Existing `filterRow`, `toolbarRow` spacing tokens.

## Scope

- Inherit: Borrow tab only
- Verify: Empty state, loading skeletons, selected-resource request panel still render below browse card
- Exclude: Mint hero card, 2-column resource grid, history section changes

## Validation

- Product: Borrow tab — set schedule, filter, search without scrolling past unrelated controls; submit flow unchanged.
- Interface: Borrow tab initial load, with/without selected resource, keyboard open on search field.
- System: Reuses existing `Card` primitive; no new spacing tokens.
- Repository: `pnpm --filter mobile exec tsc --noEmit` → no type errors

## Stop conditions

- Stop if schedule-picker readability plan is not landed first and the split still leaves schedule card taller than one viewport on 320dp — combine toolbar into schedule card instead of three cards.

## Design documentation

- After acceptance and validation: update `apps/mobile/MOBILE-PAGES.md` Borrow section to match implemented three-block header (toolbar, schedule, browse) instead of aspirational mint hero if still inaccurate.
