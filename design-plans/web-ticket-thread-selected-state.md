# Web ticket thread selected state

Written against: 2ac2938f2d158f91b84b2f38a12edbf4b8483831

## Evidence chain

- Surface: `apps/web` Tickets section → `TicketAdminPanel` thread list
- Problem: Selected ticket thread has no selected-state styling. Opening a thread updates the conversation panel but the thread article does not highlight, unlike the asset register.
- Design evidence: Asset register rows use `selected-row` + `aria-selected` when `asset.id === selectedAsset?.id` (`admin-dashboard.tsx`). `.selected-row` in `globals.css` applies `background: var(--primary-quiet)`.
- Owner: `TicketAdminPanel` thread articles in `apps/web/components/admin-dashboard.tsx`
- Scope and affected surfaces: Tickets thread list selection presentation only
- Uncertainty: none

## Design decision

Reuse the existing `selected-row` presentation contract for the active ticket thread so selection is visible in the list the same way it is in the asset register.

## Reuse

- `.selected-row` in `globals.css`
- Asset register row selection pattern (`aria-selected` + `selected-row` class)
- Exemplar: Asset register `<tr>` selection in `admin-dashboard.tsx`

## Changes

1. `TicketAdminPanel` in `apps/web/components/admin-dashboard.tsx`
   - Change: On each thread `<article>`, set `aria-selected={thread.id === selectedThreadId}` and `className` to include `selected-row` when selected. Optionally allow clicking the article body to select (same `onSelectThread`) while keeping the Open button.
   - Preserve: Thread copy, Open button, conversation panel behavior.
   - Verify: Selected thread shows primary-quiet background; switching threads moves the highlight.

2. `apps/web/app/globals.css`
   - Change: Add `.timeline-item.selected-row { background: var(--primary-quiet); }` so selection wins over `.timeline-item`'s own background (same specificity, later rule otherwise wins).
   - Preserve: Existing `.selected-row` token value for table rows.
   - Verify: Open ticket thread highlights in primary-quiet blue, not frosted white.

## Scope

- Inherit: Tickets section only
- Verify: Empty thread list and no-selection states unchanged
- Exclude: Conversation message bubbles, unread indicators, list virtualization

## Validation

- Product: Open two threads in sequence; only the current thread is highlighted.
- Interface: Tickets section at desktop and narrow widths.
- System: Reuses `.selected-row`; no new selection CSS class.
- Repository: `pnpm --filter web exec tsc --noEmit` → no type errors

## Stop conditions

- Stop if tickets move to a table layout that already has row selection; reconcile rather than duplicating.

## Design documentation

- After acceptance and validation: none.
