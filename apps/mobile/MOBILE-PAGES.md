# LABTRACK Mobile App — Page-by-Page Visual Guide

Use this document to describe or generate UI mockups for the LABTRACK mobile app. It covers every major screen, layout structure, visual style, and user flows.

---

## App Overview

**Product:** LABTRACK — a university computer-laboratory asset management mobile app  
**Platform:** React Native / Expo (iOS & Android)  
**Audience:** Faculty, instructors, and lab custodians at a computing department  
**Core jobs:** Scan equipment QR codes, borrow lab assets/rooms, report defects, track notifications, and chat with custodians via support tickets

---

## Global Design System

### Visual personality
- **Style:** Neutral iOS liquid-glass — frosted translucent surfaces, ambient gradient backgrounds, floating chrome
- **Feel:** System-native and airy — professional lab tooling with Soft UI depth (blur + specular borders)
- **Density:** Comfortable spacing; scrollable pages with generous padding
- **Typography:** Large titles (weight 800–900), headlines 700, body 500–600 — not all-bold

### Color palette

| Token | Hex / Value | Usage |
|-------|-------------|-------|
| Background | `#F2F2F7` | System grouped background |
| Ambient gradient | `#E8ECF4` → `#F2F2F7` → `#FAFAFA` | Page mesh behind glass |
| Surface glass | `rgba(255,255,255,0.55)` | Frosted card/tab fill (Android slightly more opaque) |
| Text | `#1C1C1E` | Primary label |
| Muted | `#8E8E93` | Secondary text, inactive tabs |
| Primary | `#007AFF` | System blue — CTAs, active tab, links |
| Primary Dark | `#0056B3` | Pressed / emphasis blue |
| Avatar | `#3A3A3C` | Initials avatar fill |
| Purple | `#AF52DE` | Tickets / messaging tint |
| Warning | `#FF9500` | Pending, unread |
| Danger | `#FF3B30` | Errors, overdue, critical |
| Success | `#34C759` | Available, approved, resolved |
| Glass border | `rgba(255,255,255,0.85)` | Specular edge highlight |

### Shared UI components
- **Cards:** `GlassSurface` via `Card` — BlurView + translucent fill + specular border, 24px radius; optional `tint` (`blue` / `green` / `purple` / `orange`)
- **Buttons:** Primary = solid system blue; secondary = frosted glass; subtle = blue-tinted fill
- **Badges:** Soft translucent semantic pills
- **Fields:** Frosted inputs, 16px radius
- **Notices:** Tinted translucent banners
- **Empty / skeleton:** Glass cards; skeleton uses opacity pulse
- **Icons:** Ionicons via `AppIcon` semantic wrapper

### Navigation structure

```
Sign In (unauthenticated)
    └── Protected area (authenticated)
            ├── Floating glass tab bar
            │     ├── Home (Dashboard)
            │     ├── Borrow
            │     ├── Scan (center, emphasized)
            │     ├── Alerts (Notifications)
            │     └── Profile
            └── Stack screens (transparent glass headers)
                  ├── Asset Details  (/asset/[payload])
                  ├── Defect Reports (/reports)
                  ├── Tickets          (/ticket)
                  └── Ticket Chat      (/ticket/[threadId])
```

### Bottom tab bar
- 5 tabs: **Home** | **Borrow** | **Scan** | **Alerts** | **Profile**
- Floating frosted pill (BlurView), inset from screen edges and home indicator
- Active tab: system blue icon + label; inactive: gray
- **Scan tab is visually special:** larger blue pill behind the scan icon when active

---

## Page 1 — Sign In

**Route:** `/sign-in`  
**Access:** Shown when user is not authenticated  
**Header:** None (full-screen)

### Purpose
Entry point. Users sign in or register with email/password to access lab workflows.

### Layout (top to bottom, vertically centered scroll)

1. **Hero panel** (mint-soft green card)
   - Row: App icon (58×58, rounded) + "LABTRACK" title + "Mobile asset access" subtitle
   - Large headline: *"Soft, fast lab operations in one secure mobile workspace."*
   - Caption explaining scan, borrow, and defect reporting

2. **Warning notice** (conditional) — yellow banner if backend config is missing

3. **Auth form card** (white)
   - Section title: "Sign in" or "Create account"
   - Toggle row: two side-by-side buttons — **Sign in** | **Register**
   - Fields:
     - Full name (register only)
     - Email
     - Password (masked)
   - Primary CTA: **"Open dashboard"** (sign in) or **"Create account"** (register)

4. **Quick login card** (optional, dev/demo)
   - Title: "Quick login"
   - Stacked secondary buttons for role-based one-tap login (Super Admin, Admin, Instructor)

### Visual notes for AI
- Centered content on light gray background
- Hero uses soft mint green (`#F0FBF6`) with large bold headline
- Form is a clean white card below the hero
- Minimal, welcoming — no imagery beyond the app icon

---

## Page 2 — Home / Dashboard

**Route:** `/` (tab: Home)  
**Header:** None (custom top bar inside page)

### Purpose
Operational command center. Shows lab inventory health, quick actions, borrowing queue, and recent incidents.

### Layout (top to bottom, scrollable)

1. **Top bar**
   - Left: Circular avatar (navy `#2C3A78`, white initials) + "LABTRACK" + department name (e.g. "Computing Department")
   - Right: Round notification bell button with red dot if unread

2. **Quick action row** (2×2 grid of small white pill buttons)
   - Scan | Borrow | Report | Tickets
   - Each has a small green icon + label

3. **Dashboard hero card** (white, large)
   - Eyebrow: "DASHBOARD" + monitor icon
   - Giant number: total tracked assets (e.g. **248**)
   - Caption: "tracked assets across N computer laboratories"
   - Two mini stat chips: Role | Open work count

4. **Metric grid** (2×2 cards)
   - On loan (blue icon)
   - Pending requests (purple icon)
   - Open defects (warning icon)
   - Available assets (green check icon)
   - Each card: colored icon circle, big number, label

5. **Borrowing Queue section**
   - Header: "Borrowing Queue" + "Review all" link (green)
   - Up to 3 queue cards, each showing:
     - Small avatar with initials
     - Purpose title
     - "Asset request • Due 3:00 PM"
     - Status badge (approved, pending, overdue in red)

6. **Inventory Health section**
   - Header: "Inventory Health" + "Labs" link
   - Card with:
     - Title: "Computer Laboratory Assets"
     - Circular progress ring showing availability % (e.g. 72%)
     - Three horizontal progress bars: Available (green) | Checked out (green) | For repair (orange)

7. **Recent Defect Reports section**
   - Header: "Recent Defect Reports" + "Open" link
   - Up to 3 incident cards:
     - Red/purple severity icon (! or ?)
     - Report title
     - "Asset ABC123 • Reported 2h ago"
     - Status badge

### States
- Loading: skeleton cards in list sections
- Empty queue/incidents: soft empty-state cards with explanatory text
- Error banners at top for auth, config, or API issues

### Visual notes for AI
- Feels like a **dashboard / analytics home screen**
- Mix of large hero stat + smaller metric tiles
- Navy avatar, green accents, white cards on gray background
- Information-dense but organized into clear sections

---

## Page 3 — Borrow

**Route:** `/borrow` (tab: Borrow)  
**Header:** None

### Purpose
Browse and reserve lab equipment or rooms. Select an item first, then fill schedule and purpose. View personal borrowing history.

### Layout (top to bottom, scrollable)

1. **Workflow stepper** (glass card)
   - Title: "Reservation workflow"
   - Steps: Browse → Select → Schedule & purpose → Wait for approval → Pick up
   - First visit may show a **Got it** dismiss control

2. **Toolbar card**
   - Title: "Borrow" + resource count caption
   - **Refresh** secondary button

3. **Browse resources panel** (white/glass card)
   - Caption: choose an item first, then fill the reservation form
   - Filter chips: **All** | **Equipment** | **Rooms**
   - Search field: "Equipment, room, or property number"

4. **Borrow request panel** (appears when a resource is selected)
   - Shows selected resource name
   - Compact schedule picker (date, time, duration 1.5–3 hours)
   - Purpose textarea
   - Schedule conflict preview (or green "no conflicts" notice)
   - **Submit request** primary button

5. **Resource list**
   - Each resource card:
     - Cover image (equipment photo or room photo)
     - Badges: "Equipment" or "Room" + availability
     - Resource name, category | location
   - Selected card: blue border + accent shadow

6. **My borrowing history section**
   - Title + Refresh button
   - List of history cards with status, purpose, schedule, cancel for pending

### Visual notes for AI
- **Marketplace / catalog feel** — browse before form
- Schedule controls live inside the request panel, not above the catalog
- History section below feels like an order history list

---

## Page 4 — Scan

**Route:** `/scan` (tab: Scan, center tab)  
**Header:** None

### Purpose
Full-screen camera QR scanner. Scanning a valid LABTRACK asset QR code navigates to the Asset Details screen.

### Layout — Permission denied state
- Centered white card on gray background
- Title: "Camera permission required"
- **Grant permission** or **Open settings** button

### Layout — Active scanner (primary view)
- **Full-screen live camera feed** (dark background `#111827`)
- **Top floating pill** (white, centered): "Scan" + "Camera is ready"
- **First-run coach card** (dismissible, above reticle): "Step 1 of 5: Scan the equipment QR code" with short journey bullets; **Got it** dismisses and persists
- **Center reticle:** Large square frame (~238px) with four mint-green corner brackets (viewfinder style)
- **Bottom floating card** (white, above tab bar):
  - Title: "Align the equipment QR code inside the frame."
  - Caption: "Only LABTRACK asset QR codes will open asset actions."
  - On error: caption turns red
  - While processing: "Opening asset..."

### Visual notes for AI
- **Camera-first, immersive screen** — minimal chrome
- Dark camera background with bright white overlay cards
- Mint green (`#CFF6E7`) scan corners — not a full box, just corner brackets
- This is the app's **signature / hero interaction screen**
- Tab bar still visible at bottom; Scan tab is highlighted with blue pill when active

---

## Page 5 — Notifications (Alerts)

**Route:** `/notifications` (tab: Alerts)  
**Header:** None

### Purpose
Inbox for borrow decisions, defect updates, and ticket replies.

### Layout (top to bottom, scrollable list)

1. **Hero card** (soft blue background `#EAF3FF`)
   - Kicker: "NOTIFICATION CENTER" (blue)
   - Title: *"Updates that need attention."*
   - Caption about borrow, defect, and ticket updates
   - Row: unread count pill (e.g. **3** unread) + Refresh button

2. **Notification list**
   - Each notification card:
     - Header row: "unread" (orange badge) or "read" (gray) + timestamp
     - Bold title
     - Body text (muted)
     - **Mark read** button (unread only)
   - Unread cards: orange/warning border (2px)

3. **Empty state:** "No notifications yet" with helper text

### Visual notes for AI
- **Inbox / notification center** pattern
- Blue-themed hero distinguishes this from other pages
- Unread items visually pop with warning-colored border
- Simple vertical list, not chat bubbles

---

## Page 6 — Profile

**Route:** `/profile` (tab: Profile)  
**Header:** None

### Purpose
View account info, access support tickets, and sign out.

### Layout (top to bottom, scrollable)

1. **Profile hero card** (mint-soft, horizontal)
   - Large circular avatar (navy, white initials, 76px)
   - Role badge (green, e.g. "Instructor")
   - Full name (large bold)
   - Email (muted)

2. **Metric row** (2 equal cards side by side)
   - "Active" / Account status
   - Department name / Department

3. **Account details card**
   - Title: "Account details"
   - Key-value rows: Department, Status (Active/Inactive)

4. **Support card**
   - Title: "Support"
   - Caption about borrowing and defect conversations
   - **Open support tickets** secondary button

5. **Sign out** secondary button (full width, bottom)

### Visual notes for AI
- Classic **profile / account settings** screen
- Horizontal hero with avatar left, text right
- Minimal — no edit profile, no settings toggles
- Mint hero matches brand; sign out is clearly separated at bottom

---

## Page 7 — Asset Details

**Route:** `/asset/[payload]` (stack screen)  
**Header:** "Asset Details" with back button

### Purpose
Opened after scanning a QR code. Shows asset info and role-specific actions: borrowers can request same-day borrowing or report defects; custodians can check out/return items.

### Layout (top to bottom, scrollable)

1. **Workflow stepper** (borrowers only)
   - Steps: Review asset → Choose action → Fill form → Done
   - First visit may show **Got it** dismiss

2. **Asset hero card** (mint-soft / blue tint)
   - Top row: asset image (72px rounded) or navy initials placeholder + status badge (available = green)
   - Asset name (large, ~27px bold)
   - Category | Location
   - Two stat chips: Property number | Condition
   - **Scan another asset** secondary button

3. **Asset details card**
   - Key-value rows: Property number, Serial number, Condition, QR code

4. **Role-specific sections** (conditional)

   **Custodian — Handoff panel:**
   - List of approved/checked-out borrowings for this asset
   - Each row: status badge, borrower name, purpose, schedule
   - **Check out** or **Return** buttons

   **Borrower — QR pickup panel** (only when pickup is ready / approved / already checked out):
   - Pickup status message and reservation details
   - **Confirm pickup** button when ready

   **Borrower — Choose transaction** (if no form open yet):
   - **Report defect** (secondary)
   - **Borrow item** (primary, disabled if unavailable)

   **Borrower — Same-day borrow form** (after choosing borrow):
   - Caption: Same-day borrow · 90 minutes from now
   - Purpose field only (no schedule picker)
   - Submit + Change transaction buttons

   **Borrower — Defect form** (after choosing defect):
   - Issue title field
   - Description textarea
   - Submit + Change transaction buttons

### States
- Loading: "Loading asset" card
- Not found: error message + **Scan again** button

### Visual notes for AI
- **Product detail page** triggered by QR scan
- Hero shows the "product" (equipment) with image and status
- Forms appear progressively — first choose action, then show one form
- Custodian view is operational (checkout/return); borrower view is request-oriented

---

## Page 8 — Defect Reports

**Route:** `/reports` (stack screen)  
**Header:** "Defect Reports" with back button

### Purpose
Full list of submitted equipment defect / incident reports with status and resolution notes.

### Layout (top to bottom, scrollable list)

1. **Hero card** (soft warning/yellow background `#FFF5DD`)
   - Kicker: "INCIDENT DESK" (orange)
   - Title: *"Clean defect triage for every lab."*
   - Caption about severity, asset ref, and resolution state
   - Report count pill + Refresh button

2. **Report cards**
   - Top: severity icon (red "!" for open, green "OK" for resolved) + title + meta line
   - Status badge (pending, resolved, etc.)
   - Full description text
   - Resolution notes in colored notice banner (if present)

3. **Empty state:** "No defect reports yet"

### Visual notes for AI
- **Incident / issue tracker list**
- Yellow-orange hero theme signals "alerts / problems"
- Each card reads like a support ticket summary
- Severity icon on the left is a strong visual anchor

---

## Page 9 — Tickets (Thread List)

**Route:** `/ticket` (stack screen)  
**Header:** "Tickets" with back button

### Purpose
List of support conversation threads linked to borrowing requests or defect reports.

### Layout (top to bottom, scrollable list)

1. **Hero card** (soft purple background `#F0EEFF`)
   - Kicker: "MESSAGES" (purple)
   - Title: *"Threaded lab support."*
   - Caption about conversations attached to workflows
   - Thread count pill + Refresh button

2. **Thread cards**
   - Purple circle glyph: "B" (borrowing) or "D" (defect)
   - Title: "Borrowing request" or "Defect report"
   - Reference ID + created date
   - **Open thread** primary button

3. **Empty state:** "No ticket threads yet"

### Visual notes for AI
- **Messaging inbox** but thread-based, not person-based
- Purple theme throughout
- Each card is a conversation entry point, not the chat itself

---

## Page 10 — Ticket Chat (Thread Detail)

**Route:** `/ticket/[threadId]` (stack screen)  
**Header:** "Ticket Chat" with back button

### Purpose
Read and send messages in a support thread between the user and lab custodians.

### Layout (top to bottom, scrollable)

1. **Hero card** (purple-soft)
   - Kicker: "THREAD"
   - Title: *"Shared support conversation."*
   - Caption: visible to custodians attached to this workflow
   - Refresh button

2. **Message list**
   - **Custodian messages:** white cards, left-aligned
   - **Your messages:** mint-green tinted cards, right-aligned
   - Each bubble: sender label ("You" or "Custodian") + timestamp + message body

3. **Reply card** (fixed at bottom of scroll)
   - Multiline "Reply" text field
   - **Send message** primary button

4. **Empty state:** "No messages yet" — prompt to use reply field

### Visual notes for AI
- **Simple chat / messaging UI**
- Asymmetric bubbles: yours on the right (green tint), theirs on the left (white)
- Not a full chat app — no avatars, no read receipts, no attachments
- Purple hero at top, conversation in the middle, compose area at bottom

---

## User Flows (for context)

### Flow A — Scan → Same-day borrow
1. User opens **Scan** tab → (first visit) dismisses coach → points camera at equipment QR
2. App navigates to **Asset Details** with workflow stepper
3. User taps **Borrow item** → fills purpose only (90 minutes from now) → submits
4. Request appears in **Borrow** history and **Home** borrowing queue
5. Custodian approves → user gets **Notification**
6. User scans again → **QR pickup** → **Confirm pickup**

### Flow B — Scan → Report defect
1. Scan QR → **Asset Details**
2. Tap **Report defect** → enter title + description → submit
3. Report appears in **Defect Reports** and **Home** recent incidents
4. Support **Ticket** thread may be created for follow-up

### Flow C — Browse reservation (without scan)
1. Open **Borrow** tab → browse/filter/search resources (schedule not required yet)
2. Tap a resource card → set schedule + purpose → submit request
3. Track status in borrowing history
4. After approval, pick up at custodian office by scanning the item QR

---

## AI Visualization Prompt Template

Copy and adapt this when asking an AI image tool to mock up a screen:

```
Design a mobile app screen for LABTRACK, a university lab asset management app.

Screen: [SCREEN NAME]
Platform: iOS/Android mobile, portrait
Style: Neutral iOS liquid-glass — frosted BlurView cards, ambient gray-blue gradient background (#E8ECF4→#F2F2F7), system blue primary (#007AFF), soft specular white borders, floating glass tab bar, bold but not all-900 typography (#1C1C1E text)

Layout:
[Paste the numbered layout section for that page]

Bottom tab bar (if applicable): Floating frosted pill — Home | Borrow | Scan (center, blue pill when active) | Alerts | Profile

Mood: Native iOS system aesthetic, airy depth, professional lab tooling. No stock photos except equipment thumbnails on borrow cards.
```

---

## Screen Index

| # | Screen | Route | Tab / Stack | Theme color |
|---|--------|-------|-------------|-------------|
| 1 | Sign In | `/sign-in` | Auth gate | Blue glass |
| 2 | Home / Dashboard | `/` | Tab: Home | Blue tint + multi |
| 3 | Borrow | `/borrow` | Tab: Borrow | Blue glass |
| 4 | Scan | `/scan` | Tab: Scan | Dark camera + blue glass overlays |
| 5 | Notifications | `/notifications` | Tab: Alerts | Blue tint |
| 6 | Profile | `/profile` | Tab: Profile | Blue glass |
| 7 | Asset Details | `/asset/[payload]` | Stack | Blue glass |
| 8 | Defect Reports | `/reports` | Stack | Orange tint |
| 9 | Tickets | `/ticket` | Stack | Purple tint |
| 10 | Ticket Chat | `/ticket/[threadId]` | Stack | Purple tint |

---

*Generated from the LABTRACK mobile app source (`apps/mobile`). Update this file when screens change.*
