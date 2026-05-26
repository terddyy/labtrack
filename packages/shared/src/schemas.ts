import { z } from "zod";
import { assetConditions, assetStatuses, bookingStatuses, defectStatuses, userRoles } from "./statuses.js";

const qrCodeValueSchema = z.string().trim().min(1).max(160);
const lifecycleNotesSchema = z.string().trim().max(2000).nullable().optional();
const decisionNotesSchema = z.string().trim().max(1000).nullable().optional();

export const profileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string().min(2).max(120),
  role: z.enum(userRoles),
  department: z.string().max(120).nullable().optional(),
  isActive: z.boolean()
});

export const assetSchema = z.object({
  propertyNumber: z.string().min(2).max(80),
  serialNumber: z.string().max(120).nullable().optional(),
  name: z.string().min(2).max(160),
  categoryId: z.uuid(),
  locationId: z.uuid(),
  condition: z.enum(assetConditions),
  status: z.enum(assetStatuses)
});

export const bookingRequestSchema = z.object({
  assetId: z.uuid(),
  requestedStartAt: z.iso.datetime(),
  requestedEndAt: z.iso.datetime(),
  purpose: z.string().min(5).max(500)
}).refine((value) => new Date(value.requestedEndAt) > new Date(value.requestedStartAt), {
  message: "Booking end time must be after the start time.",
  path: ["requestedEndAt"]
});

export const bookingStatusSchema = z.enum(bookingStatuses);

export const defectReportSchema = z.object({
  assetId: z.uuid(),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(1500)
});

export const defectStatusSchema = z.enum(defectStatuses);

export const ticketMessageSchema = z.object({
  threadId: z.uuid(),
  body: z.string().min(1).max(2000)
});

export const resolveAssetByQrCodeInputSchema = z.object({
  p_qr_code: qrCodeValueSchema
});

export const regenerateAssetQrInputSchema = z.object({
  p_asset_id: z.uuid(),
  p_qr_code: qrCodeValueSchema
});

export const createBookingInputSchema = z.object({
  p_asset_id: z.uuid(),
  p_requested_start_at: z.iso.datetime(),
  p_requested_end_at: z.iso.datetime(),
  p_purpose: z.string().trim().min(5).max(500)
}).refine((value) => new Date(value.p_requested_end_at) > new Date(value.p_requested_start_at), {
  message: "Booking end time must be after the start time.",
  path: ["p_requested_end_at"]
});

export const cancelBookingInputSchema = z.object({
  p_booking_id: z.uuid()
});

export const bookingDecisionStatusSchema = z.enum(["approved", "rejected"]);

export const decideBookingInputSchema = z.object({
  p_booking_id: z.uuid(),
  p_status: bookingDecisionStatusSchema,
  p_notes: decisionNotesSchema
});

export const checkoutBookingInputSchema = z.object({
  p_booking_id: z.uuid(),
  p_notes: lifecycleNotesSchema
});

export const returnBookingInputSchema = z.object({
  p_booking_id: z.uuid(),
  p_notes: lifecycleNotesSchema
});

export const createDefectReportInputSchema = z.object({
  p_asset_id: z.uuid(),
  p_title: z.string().trim().min(3).max(120),
  p_description: z.string().trim().min(10).max(1500)
});

export const defectTriageStatusSchema = z.enum(["under_review", "sent_for_repair", "resolved", "rejected"]);

export const triageDefectReportInputSchema = z.object({
  p_defect_report_id: z.uuid(),
  p_status: defectTriageStatusSchema,
  p_notes: lifecycleNotesSchema
});

export const ticketSubjectTypeSchema = z.enum(["booking", "defect_report"]);

export const ensureTicketThreadInputSchema = z.object({
  p_subject_type: ticketSubjectTypeSchema,
  p_booking_id: z.uuid().nullable().optional(),
  p_defect_report_id: z.uuid().nullable().optional()
}).refine((value) => {
  if (value.p_subject_type === "booking") {
    return Boolean(value.p_booking_id) && !value.p_defect_report_id;
  }

  return Boolean(value.p_defect_report_id) && !value.p_booking_id;
}, {
  message: "Ticket thread input must include exactly one matching subject id.",
  path: ["p_subject_type"]
});

export const sendTicketMessageInputSchema = z.object({
  p_thread_id: z.uuid(),
  p_body: z.string().trim().min(1).max(2000)
});

export const markNotificationReadInputSchema = z.object({
  p_notification_id: z.uuid()
});

export type ResolveAssetByQrCodeInput = z.infer<typeof resolveAssetByQrCodeInputSchema>;
export type RegenerateAssetQrInput = z.infer<typeof regenerateAssetQrInputSchema>;
export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingInputSchema>;
export type DecideBookingInput = z.infer<typeof decideBookingInputSchema>;
export type CheckoutBookingInput = z.infer<typeof checkoutBookingInputSchema>;
export type ReturnBookingInput = z.infer<typeof returnBookingInputSchema>;
export type CreateDefectReportInput = z.infer<typeof createDefectReportInputSchema>;
export type TriageDefectReportInput = z.infer<typeof triageDefectReportInputSchema>;
export type EnsureTicketThreadInput = z.infer<typeof ensureTicketThreadInputSchema>;
export type SendTicketMessageInput = z.infer<typeof sendTicketMessageInputSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadInputSchema>;
