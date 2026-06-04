export const userRoles = ["super_admin", "admin", "custodian", "instructor", "faculty", "student"] as const;
export type UserRole = (typeof userRoles)[number];

export const assetStatuses = ["available", "reserved", "checked_out", "under_review", "for_repair", "retired"] as const;
export type AssetStatus = (typeof assetStatuses)[number];

export const assetConditions = ["excellent", "good", "fair", "defective", "for_repair", "retired"] as const;
export type AssetCondition = (typeof assetConditions)[number];

export const bookingStatuses = ["pending", "approved", "rejected", "cancelled", "checked_out", "returned"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const defectStatuses = ["pending", "under_review", "sent_for_repair", "resolved", "rejected"] as const;
export type DefectStatus = (typeof defectStatuses)[number];

export const notificationTypes = ["booking_update", "defect_update", "ticket_message", "system"] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const terminalBookingStatuses: BookingStatus[] = ["rejected", "cancelled", "returned"];
export const activeAssetStatuses: AssetStatus[] = ["available", "reserved", "checked_out", "under_review"];
