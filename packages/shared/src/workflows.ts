import type { BookingStatus, DefectStatus, UserRole } from "./statuses.js";

export type StatusTone = "danger" | "neutral" | "success" | "warning";
export type BookingWorkflowAction = "approve" | "reject" | "cancel" | "checkout" | "return";
export type DefectWorkflowAction = "review" | "send_for_repair" | "resolve" | "reject";

const terminalBookingStatuses: readonly BookingStatus[] = ["rejected", "cancelled", "returned"];
export const activeBookingStatuses: readonly BookingStatus[] = ["pending", "approved", "checked_out"];
export const terminalDefectStatuses: readonly DefectStatus[] = ["resolved", "rejected"];
export const openDefectStatuses: readonly DefectStatus[] = ["pending", "under_review", "sent_for_repair"];

const bookingActionsByStatus = {
  pending: ["approve", "reject", "cancel"],
  approved: ["checkout", "cancel"],
  checked_out: ["return"],
  rejected: [],
  cancelled: [],
  returned: []
} as const satisfies Record<BookingStatus, readonly BookingWorkflowAction[]>;

const defectTransitionsByStatus = {
  pending: ["under_review", "sent_for_repair", "resolved", "rejected"],
  under_review: ["sent_for_repair", "resolved", "rejected"],
  sent_for_repair: ["resolved", "rejected"],
  resolved: [],
  rejected: []
} as const satisfies Record<DefectStatus, readonly DefectStatus[]>;

const defectActionsByTransition = {
  under_review: "review",
  sent_for_repair: "send_for_repair",
  resolved: "resolve",
  rejected: "reject"
} as const satisfies Record<Exclude<DefectStatus, "pending">, DefectWorkflowAction>;

export function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function getBookingWorkflowActions(status: BookingStatus): readonly BookingWorkflowAction[] {
  return bookingActionsByStatus[status];
}

export function getDefectTransitions(status: DefectStatus): readonly DefectStatus[] {
  return defectTransitionsByStatus[status];
}

export function getDefectWorkflowActions(status: DefectStatus): readonly DefectWorkflowAction[] {
  return defectTransitionsByStatus[status].map((nextStatus) => defectActionsByTransition[nextStatus as Exclude<DefectStatus, "pending">]);
}

export function isTerminalBookingStatus(status: BookingStatus) {
  return terminalBookingStatuses.includes(status);
}

export function isActiveBookingStatus(status: BookingStatus) {
  return activeBookingStatuses.includes(status);
}

export function isTerminalDefectStatus(status: DefectStatus) {
  return terminalDefectStatuses.includes(status);
}

export function isOpenDefectStatus(status: DefectStatus) {
  return openDefectStatuses.includes(status);
}

export function getBookingStatusTone(status: BookingStatus): StatusTone {
  if (status === "approved" || status === "returned") {
    return "success";
  }

  if (status === "rejected" || status === "cancelled") {
    return "danger";
  }

  return "warning";
}

export function getDefectStatusTone(status: DefectStatus): StatusTone {
  if (status === "resolved") {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  return "warning";
}

export function getRoleTone(role: UserRole): StatusTone {
  return role === "super_admin" ? "success" : role === "admin" ? "warning" : "neutral";
}

export function getDashboardCounters(input: {
  assets: Array<{ activeQr?: unknown }>;
  bookings: Array<{ status: BookingStatus }>;
  defects: Array<{ status: DefectStatus }>;
  notifications?: Array<{ readAt?: string | null; read_at?: string | null }>;
}) {
  return {
    registeredAssets: input.assets.length,
    activeQrCodes: input.assets.filter((asset) => Boolean(asset.activeQr)).length,
    activeBookings: input.bookings.filter((booking) => isActiveBookingStatus(booking.status)).length,
    pendingBookings: input.bookings.filter((booking) => booking.status === "pending").length,
    openDefects: input.defects.filter((defect) => isOpenDefectStatus(defect.status)).length,
    unreadNotifications: (input.notifications ?? []).filter((notification) => {
      const readAt = "readAt" in notification ? notification.readAt : notification.read_at;
      return !readAt;
    }).length
  };
}
