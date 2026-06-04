export const backendRpcNames = {
  listAdminAssets: "list_admin_assets",
  resolveAssetByQrCode: "resolve_asset_by_qr_code",
  regenerateAssetQr: "regenerate_asset_qr",
  createBooking: "create_booking",
  cancelBooking: "cancel_booking",
  decideBooking: "decide_booking",
  checkoutBooking: "checkout_booking",
  returnBooking: "return_booking",
  createDefectReport: "create_defect_report",
  triageDefectReport: "triage_defect_report",
  ensureTicketThread: "ensure_ticket_thread",
  sendTicketMessage: "send_ticket_message",
  markNotificationRead: "mark_notification_read"
} as const;

export const backendRpcArgumentNames = {
  listAdminAssets: ["p_limit", "p_offset"],
  resolveAssetByQrCode: ["p_qr_code"],
  regenerateAssetQr: ["p_asset_id", "p_qr_code"],
  createBooking: ["p_asset_id", "p_requested_start_at", "p_requested_end_at", "p_purpose"],
  cancelBooking: ["p_booking_id"],
  decideBooking: ["p_booking_id", "p_status", "p_notes"],
  checkoutBooking: ["p_booking_id", "p_notes"],
  returnBooking: ["p_booking_id", "p_notes"],
  createDefectReport: ["p_asset_id", "p_title", "p_description"],
  triageDefectReport: ["p_defect_report_id", "p_status", "p_notes"],
  ensureTicketThread: ["p_subject_type", "p_booking_id", "p_defect_report_id"],
  sendTicketMessage: ["p_thread_id", "p_body"],
  markNotificationRead: ["p_notification_id"]
} as const;

export type BackendRpcKey = keyof typeof backendRpcNames;
export type BackendRpcName = (typeof backendRpcNames)[BackendRpcKey];
export type BackendRpcArgumentName = (typeof backendRpcArgumentNames)[BackendRpcKey][number];
