# Web notice feedback semantics

Written against: 2ac2938f2d158f91b84b2f38a12edbf4b8483831

## Evidence chain

- Surface: `apps/web` Custodian dashboard authorized shell → `Notice` under topbar (`admin-dashboard.tsx` dashboard message)
- Problem: Successful workflow feedback renders as warning (orange + AlertTriangle). Messages such as “Message sent.”, “Borrowing approved.”, and “Allowed email domain added.” fail the `created`/`updated` substring check and get `tone="warning"`.
- Design evidence: `apps/web/app/globals.css` defines distinct `.notice.success` (green) vs `.notice.warning` (orange) vs `.notice.danger` / `.notice.neutral`.
- Owner: `Notice` in `apps/web/components/admin/ui.tsx`; caller heuristic at `admin-dashboard.tsx` dashboard message render
- Scope and affected surfaces: All `dashboardMessage` success/error feedback in the authorized shell; `Notice` icon presentation for all tones app-wide
- Uncertainty: none

## Design decision

Stop inferring notice tone from message text. Store an explicit tone with the dashboard message, and render tone-appropriate icons in `Notice` so success uses green success styling and a check icon, not warning chrome.

## Reuse

- `.notice.success`, `.notice.warning`, `.notice.danger`, `.notice.neutral` in `globals.css`
- Existing `Notice` `tone` prop contract in `admin/ui.tsx`
- Exemplar: Access shell notices that already pass explicit tones (`tone="danger"`, `tone="warning"`, `tone="neutral"`)

## Changes

1. `apps/web/components/admin/ui.tsx`
   - Change: Map `Notice` icons by tone (`CheckCircle2` for success, `AlertTriangle` for warning/danger, `Info` or equivalent for neutral). Keep existing ARIA live/role behavior.
   - Preserve: Tone class names, layout, and children rendering.
   - Verify: Success notices show a check icon; warning/danger keep triangle.

2. `apps/web/components/admin-dashboard.tsx`
   - Change: Replace `dashboardMessage: string | null` with a small `{ text, tone }` state (or parallel tone state). Set `tone: "success"` for successful mutations and `tone: "warning"` (or `"danger"` where already used for hard failures) for errors. Render `<Notice tone={...}>{text}</Notice>` without substring heuristics.
   - Preserve: Message copy strings and when messages clear.
   - Verify: Approving a booking, sending a ticket reply, and adding a domain show green success notices; load/create failures show warning/danger as appropriate.

## Scope

- Inherit: All authorized-shell dashboard message consumers
- Verify: Sign-in / access-shell `Notice` callers still compile and look correct with new icons
- Exclude: Calendar/report local `message` props unless they share the same heuristic (they already pass explicit tones)

## Validation

- Product: Complete a successful booking approve and a failed load; notices match success vs warning/danger.
- Interface: Authorized shell after mutation; access shell checking/missing-config/forbidden states.
- System: One `Notice` owner; no parallel alert component.
- Repository: `pnpm --filter web exec tsc --noEmit` → no type errors

## Stop conditions

- Stop if product intentionally wants all operational feedback as warning chrome; document as an explicit exception before reverting.

## Design documentation

- After acceptance and validation: none (token classes already encode the contract).
