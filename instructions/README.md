# LABTRACK User Instructions

LABTRACK helps the College of Computing Studies keep track of laboratory equipment. It is used to register equipment, print QR labels, request equipment bookings, report defects, and communicate about equipment issues.

This guide is written for everyday users. You do not need to know how the system was built.

## Which App Should You Use?

| User | Use This | Main Purpose |
| --- | --- | --- |
| Instructor | LABTRACK Android app | Scan equipment QR codes, request bookings, report defects, read updates, and reply to ticket chats. |
| Admin | LABTRACK web dashboard | Manage equipment, QR labels, bookings, defect reports, tickets, categories, and locations. |
| Super Admin | LABTRACK web dashboard | Do everything an admin can do, plus manage user access and roles. |

## Before You Start

- Make sure you have a LABTRACK account.
- Use the account assigned to your role: instructor, admin, or super admin.
- For instructors, use an Android phone with camera access enabled.
- For admins, use the web dashboard on a computer or tablet.
- If training/demo access is enabled, you may see quick login buttons such as "Instructor login", "Admin login", or "Super admin login".
- For real school use, use your official account instead of demo access.

## Important Words

| Word | Meaning |
| --- | --- |
| Asset | A physical item, such as a computer, monitor, projector, or other lab equipment. |
| QR label | The printed QR code attached to an asset. Instructors scan it to open the asset record. |
| Booking | A request to use an asset for a class, activity, or lab need. |
| Defect report | A report that an asset is damaged, missing parts, or not working properly. |
| Ticket chat | A conversation connected to a booking or defect report. |
| Status | The current condition or progress of an asset, booking, or defect report. |

## Instructor Guide

Instructors use the LABTRACK Android app.

### 1. Sign In

1. Open the LABTRACK app.
2. Tap **Sign in**.
3. Enter your email and password.
4. Tap **Open dashboard**.

If demo access is available, tap **Instructor login** only when you are told to use the demo account.

### 2. Understand the Home Screen

After signing in, the home screen shows:

- **Bookings**: your active booking requests.
- **Defects**: your open defect reports.
- **Unread**: notifications you have not read yet.
- **Threads**: ticket conversations connected to your requests or reports.

You can also open these actions:

- **Scan equipment**
- **Bookings**
- **Defect reports**
- **Notifications**
- **Ticket chat**

### 3. Scan an Equipment QR Code

1. Tap **Scan equipment** or **Scan QR**.
2. Allow camera permission if the app asks for it.
3. Point the camera at the LABTRACK QR label on the equipment.
4. Keep the QR code inside the camera view until the asset opens.

If the app says the QR code is not valid, check that you scanned a LABTRACK asset QR label. If the asset is not found, the QR code may be old, inactive, or replaced by an admin.

### 4. Check Asset Details

After a successful scan, the app shows the asset details:

- Asset name
- Category
- Location
- Property number
- Serial number, if available
- Condition
- Current status
- QR code

Check the asset details before requesting a booking or reporting a defect.

### 5. Request a Booking

Use this when you want to reserve or use equipment.

1. Scan the asset QR code.
2. Go to **Request booking**.
3. Enter the **Purpose**. Example: "Class demonstration for CCS lab activity".
4. Enter the **Start time**.
5. Enter the **End time**.
6. Tap **Submit booking request**.

For now, enter date and time in the format shown in the app, for example:

```text
2026-05-22T09:00:00+08:00
```

Make sure the end time is later than the start time.

### 6. Track a Booking

1. From the home screen, tap **Bookings**.
2. Review the status of your requests.
3. Tap **Refresh** if you want to check for new updates.

Booking statuses:

| Status | Meaning |
| --- | --- |
| Pending | Waiting for admin approval. |
| Approved | The admin approved the request. |
| Rejected | The admin did not approve the request. |
| Cancelled | The request was cancelled. |
| Checked out | The asset has been released for use. |
| Returned | The asset has been returned. |

You can cancel a booking while it is still **Pending**.

### 7. Report a Defect

Use this when equipment is damaged, missing parts, or not working as expected.

1. Scan the asset QR code.
2. Go to **Report defect**.
3. Enter a short **Issue title**. Example: "Monitor has no display".
4. Enter a clear **Description**. Include what happened and what you noticed.
5. Tap **Submit defect report**.

Good defect reports are specific. Instead of writing "broken", write what is broken, when you noticed it, and whether the item can still be used.

### 8. Track Defect Reports

1. From the home screen, tap **Defect reports**.
2. Review each report and its status.
3. Tap **Refresh** to check for updates.

Defect statuses:

| Status | Meaning |
| --- | --- |
| Pending | The report was submitted and is waiting for review. |
| Under review | An admin is checking the report. |
| Sent for repair | The item was marked for repair. |
| Resolved | The issue was fixed or closed. |
| Rejected | The report was not accepted. |

### 9. Read Notifications

1. Tap **Notifications**.
2. Read new booking, defect, or ticket updates.
3. Tap **Mark read** after reading an unread notification.
4. Tap **Refresh** if needed.

### 10. Use Ticket Chat

Ticket chat is used when you need to discuss a booking or defect report with an admin.

1. Tap **Ticket chat**.
2. Open the related thread.
3. Type your message in **Reply**.
4. Tap **Send message**.

Keep messages clear and related to the selected booking or defect report.

### 11. Sign Out

1. Return to the home screen.
2. Tap **Sign out** in your account area.

Sign out when using a shared device.

## Admin Guide

Admins use the LABTRACK web dashboard.

### 1. Sign In

1. Open the LABTRACK web dashboard.
2. Enter your admin email and password.
3. Click **Sign in**.

If demo access is available, click **Admin login** only during training or testing.

If the system says you do not have active admin access, ask a super admin to check your account role and status.

### 2. Dashboard Overview

The dashboard shows a quick summary:

- Registered assets
- Pending bookings
- Defect reports
- Active QR codes

Use **Sync Supabase** to refresh the latest records from the system.

### 3. Set Up Categories and Locations First

Before adding assets, create the category and location choices.

1. Open **Catalog**.
2. Under **Asset categories**, type a category name.
3. Click **Create category**.
4. Under **Locations**, type a location name.
5. Click **Create location**.

Examples:

- Categories: Laptop, Monitor, Projector, Keyboard, System Unit
- Locations: CCS Lab 1, CCS Lab 2, Faculty Room, Storage Room

### 4. Add a New Asset

1. Open **Assets & QR**.
2. Click **New asset**.
3. Fill in the asset details:
   - Asset name
   - Property number
   - Serial number, if available
   - Category
   - Location
   - Condition
   - Status
   - Notes, if needed
4. Click **Create asset**.

Use one asset record for one physical item. Do not use one record for a group of items.

### 5. Generate and Print a QR Label

1. Open **Assets & QR**.
2. Select the asset from the asset register.
3. Click **Preview** to show its QR label.
4. Click **Generate QR** or **Generate** if the asset has no QR code yet.
5. Click **Download PNG**.
6. Print the downloaded QR label.
7. Attach the label to the correct physical asset.

Important: if you click **Regenerate**, the old QR code should no longer be used. Print and attach the new QR label.

### 6. Manage Booking Requests

1. Open **Bookings**.
2. Review the asset, instructor, purpose, date, and time.
3. Choose the correct action:
   - **Approve** if the instructor may use the asset.
   - **Reject** if the request should not continue.
   - **Cancel** if the request needs to be stopped.
   - **Check out** when the approved asset is physically released.
   - **Return** when the asset is physically returned.

Only check out an item when it has actually been released. Only mark it returned when it has actually been received back.

### 7. Manage Defect Reports

1. Open **Defects**.
2. Read the report title and description.
3. Choose the correct action:
   - **Review** when you are checking the report.
   - **Send for repair** when the item needs repair.
   - **Resolve** when the issue is fixed or closed.
   - **Reject** when the report is not valid or does not apply.

Update the defect status as soon as the decision is clear so instructors can see the latest information.

### 8. Reply to Ticket Chats

1. Open **Tickets**.
2. Select a ticket thread.
3. Read the conversation.
4. Type your reply in **Reply**.
5. Click **Send message**.

Use ticket chat for short updates, questions, and clarifications connected to the booking or defect report.

### 9. Asset Status Guide

| Asset Status | When to Use It |
| --- | --- |
| Available | The item can be requested or used. |
| Reserved | The item is set aside for an approved booking. |
| Checked out | The item is currently released to an instructor. |
| Under review | The item is being checked after a concern or report. |
| For repair | The item should not be used until repaired. |
| Retired | The item is no longer in active use. |

### 10. Sign Out

Click **Sign out** when finished, especially on a shared computer.

## Super Admin Guide

Super admins use the same web dashboard as admins. They can do everything admins can do, plus manage account access.

### 1. Sign In

1. Open the LABTRACK web dashboard.
2. Sign in using a super admin account.

If demo access is available, click **Super admin login** only during training or testing.

### 2. Manage User Access

1. Open **Access**.
2. Find the user account.
3. Use the **Role** dropdown to choose:
   - Instructor
   - Admin
   - Super admin
4. Use **Activate** or **Deactivate** to control whether the account can use LABTRACK.

Only super admins can manage account access. Admins who open this screen will see a message that access management is limited to super admins.

### 3. Recommended Access Rules

- Give **Instructor** access to faculty who need the Android app for scanning, bookings, reports, and ticket replies.
- Give **Admin** access to staff who manage equipment, QR labels, bookings, defects, and tickets.
- Give **Super admin** access only to trusted users who should manage other accounts.
- Keep at least one active super admin account at all times.
- Deactivate accounts that should no longer access the system.

### 4. Super Admin Setup Checklist

Use this when preparing LABTRACK for real use:

1. Confirm there is at least one active super admin.
2. Create or activate admin accounts.
3. Create or activate instructor accounts.
4. Open **Catalog** and confirm categories and locations are ready.
5. Open **Assets & QR** and confirm assets have correct records.
6. Generate and print QR labels for all active assets.
7. Test one instructor scan, booking request, defect report, notification, and ticket reply.

## Common Daily Workflow

1. Super admin makes sure the correct users have access.
2. Admin creates categories, locations, and asset records.
3. Admin generates and prints QR labels.
4. QR labels are attached to the correct equipment.
5. Instructor scans a QR label using the Android app.
6. Instructor requests a booking or reports a defect.
7. Admin approves, rejects, checks out, returns, or triages the request.
8. Instructor receives updates through notifications and ticket chat.

## Troubleshooting

| Problem | What To Do |
| --- | --- |
| I cannot sign in. | Check your email and password. If they are correct, ask an admin or super admin to confirm your account is active. |
| The web dashboard says I do not have admin access. | Your account may be inactive or assigned as an instructor. Ask a super admin to update your access. |
| The mobile app says my profile is inactive. | Ask an admin or super admin to reactivate your account. |
| The camera will not open. | Allow camera permission. If permission was blocked, open your phone settings and allow camera access for LABTRACK. |
| The QR code is not valid. | Make sure you scanned a LABTRACK QR label, not another QR code. |
| The asset is not found after scanning. | The QR label may be old, inactive, regenerated, or attached to the wrong item. Ask an admin to check the asset QR label. |
| I cannot submit a booking. | Make sure the purpose is clear, the start and end time are filled in, and the end time is later than the start time. |
| I do not see my latest updates. | Tap **Refresh** on the related screen or ask the admin to confirm the record was updated. |
| A button is disabled. | Check that all required fields are filled in and that your account is active. |

## Good Practices

- Do not share your account password.
- Do not use another person's account.
- Do not remove or swap QR labels between assets.
- Do not keep using an old QR label after an admin regenerates it.
- Always check the physical item before marking it checked out or returned.
- Use clear descriptions for booking purposes and defect reports.
- Sign out on shared devices.

