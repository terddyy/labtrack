import { z } from "zod";
import {
  assetConditions,
  assetStatuses,
  bookingStatuses,
  defectStatuses,
  notificationTypes,
  userRoles
} from "./statuses.js";

const qrCodeValueSchema = z.string().trim().min(1).max(160);
const optionalNotesSchema = (maxLength: number) => z.string()
  .trim()
  .max(maxLength)
  .transform((value) => value || null)
  .nullable()
  .optional();
const lifecycleNotesSchema = optionalNotesSchema(2000);
const decisionNotesSchema = optionalNotesSchema(1000);
const idSchema = z.uuid();
const timestampSchema = z.string().min(1);

export const profileSchema = z.object({
  id: idSchema,
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
  categoryId: idSchema,
  locationId: idSchema,
  condition: z.enum(assetConditions),
  status: z.enum(assetStatuses)
});

export const bookingRequestSchema = z.object({
  assetId: idSchema,
  requestedStartAt: z.iso.datetime(),
  requestedEndAt: z.iso.datetime(),
  purpose: z.string().min(5).max(500)
}).refine((value) => new Date(value.requestedEndAt) > new Date(value.requestedStartAt), {
  message: "Borrow end time must be after the start time.",
  path: ["requestedEndAt"]
});

export const bookingStatusSchema = z.enum(bookingStatuses);

export const defectReportSchema = z.object({
  assetId: idSchema,
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(1500)
});

export const defectStatusSchema = z.enum(defectStatuses);

export const ticketMessageSchema = z.object({
  threadId: idSchema,
  body: z.string().min(1).max(2000)
});

export const resolveAssetByQrCodeInputSchema = z.object({
  p_qr_code: qrCodeValueSchema
});

export const listAdminAssetsInputSchema = z.object({
  p_limit: z.number().int().min(1).max(500).optional(),
  p_offset: z.number().int().min(0).optional()
});

export const regenerateAssetQrInputSchema = z.object({
  p_asset_id: idSchema,
  p_qr_code: qrCodeValueSchema
});

export const createBookingInputSchema = z.object({
  p_asset_id: idSchema,
  p_requested_start_at: z.iso.datetime(),
  p_requested_end_at: z.iso.datetime(),
  p_purpose: z.string().trim().min(5).max(500)
}).refine((value) => new Date(value.p_requested_end_at) > new Date(value.p_requested_start_at), {
  message: "Borrow end time must be after the start time.",
  path: ["p_requested_end_at"]
}).refine((value) => new Date(value.p_requested_start_at).getTime() > Date.now(), {
  message: "Borrow start time must be later than now.",
  path: ["p_requested_start_at"]
});

export const cancelBookingInputSchema = z.object({
  p_booking_id: idSchema
});

export const bookingDecisionStatusSchema = z.enum(["approved", "rejected"]);

export const decideBookingInputSchema = z.object({
  p_booking_id: idSchema,
  p_status: bookingDecisionStatusSchema,
  p_notes: decisionNotesSchema
});

export const checkoutBookingInputSchema = z.object({
  p_booking_id: idSchema,
  p_notes: lifecycleNotesSchema
});

export const returnBookingInputSchema = z.object({
  p_booking_id: idSchema,
  p_notes: lifecycleNotesSchema
});

export const createDefectReportInputSchema = z.object({
  p_asset_id: idSchema,
  p_title: z.string().trim().min(3).max(120),
  p_description: z.string().trim().min(10).max(1500)
});

export const defectTriageStatusSchema = z.enum(["under_review", "sent_for_repair", "resolved", "rejected"]);

export const triageDefectReportInputSchema = z.object({
  p_defect_report_id: idSchema,
  p_status: defectTriageStatusSchema,
  p_notes: lifecycleNotesSchema
});

export const ticketSubjectTypeSchema = z.enum(["booking", "defect_report"]);

export const ensureTicketThreadInputSchema = z.object({
  p_subject_type: ticketSubjectTypeSchema,
  p_booking_id: idSchema.nullable().optional(),
  p_defect_report_id: idSchema.nullable().optional()
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
  p_thread_id: idSchema,
  p_body: z.string().trim().min(1).max(2000)
});

export const markNotificationReadInputSchema = z.object({
  p_notification_id: idSchema
});

export const profileRowDtoSchema = z.object({
  id: idSchema,
  email: z.email(),
  full_name: z.string(),
  role: z.enum(userRoles),
  department: z.string().nullable(),
  is_active: z.boolean(),
  created_at: timestampSchema.optional(),
  updated_at: timestampSchema.optional()
});

export const assetQrCodeRowDtoSchema = z.object({
  id: idSchema,
  asset_id: idSchema,
  code: z.string(),
  is_active: z.boolean(),
  generated_by: idSchema.nullable(),
  generated_at: timestampSchema,
  invalidated_at: timestampSchema.nullable(),
  invalidated_by: idSchema.nullable()
});

export const instructorAssetLookupDtoSchema = z.object({
  qr_code_id: idSchema,
  asset_id: idSchema,
  property_number: z.string(),
  serial_number: z.string().nullable(),
  name: z.string(),
  category_id: idSchema,
  category_name: z.string(),
  location_id: idSchema,
  location_name: z.string(),
  condition: z.enum(assetConditions),
  status: z.enum(assetStatuses),
  active_qr_code: z.string(),
  qr_generated_at: timestampSchema
});

export const adminAssetRowDtoSchema = z.object({
  id: idSchema,
  property_number: z.string(),
  serial_number: z.string().nullable(),
  name: z.string(),
  category_id: idSchema,
  category_name: z.string(),
  location_id: idSchema,
  location_name: z.string(),
  condition: z.enum(assetConditions),
  status: z.enum(assetStatuses),
  notes: z.string().nullable(),
  created_by: idSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  active_qr_code_id: idSchema.nullable(),
  active_qr_code: z.string().nullable(),
  active_qr_generated_at: timestampSchema.nullable()
});

export const bookingRowDtoSchema = z.object({
  id: idSchema,
  asset_id: idSchema,
  instructor_id: idSchema,
  requested_start_at: timestampSchema,
  requested_end_at: timestampSchema,
  purpose: z.string(),
  status: z.enum(bookingStatuses),
  decided_by: idSchema.nullable(),
  decided_at: timestampSchema.nullable(),
  decision_notes: z.string().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const bookingRpcResultDtoSchema = z.object({
  booking_id: idSchema,
  ticket_thread_id: idSchema,
  asset_id: idSchema,
  instructor_id: idSchema,
  requested_start_at: timestampSchema,
  requested_end_at: timestampSchema,
  purpose: z.string(),
  status: z.enum(bookingStatuses),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const defectReportRowDtoSchema = z.object({
  id: idSchema,
  asset_id: idSchema,
  instructor_id: idSchema,
  title: z.string(),
  description: z.string(),
  status: z.enum(defectStatuses),
  triaged_by: idSchema.nullable(),
  triaged_at: timestampSchema.nullable(),
  resolution_notes: z.string().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const defectReportRpcResultDtoSchema = z.object({
  defect_report_id: idSchema,
  ticket_thread_id: idSchema,
  asset_id: idSchema,
  instructor_id: idSchema,
  title: z.string(),
  description: z.string(),
  status: z.enum(defectStatuses),
  created_at: timestampSchema,
  updated_at: timestampSchema
});

export const ticketThreadRowDtoSchema = z.object({
  id: idSchema,
  subject_type: ticketSubjectTypeSchema,
  booking_id: idSchema.nullable(),
  defect_report_id: idSchema.nullable(),
  created_at: timestampSchema
});

export const ticketMessageRowDtoSchema = z.object({
  id: idSchema,
  thread_id: idSchema,
  sender_id: idSchema,
  body: z.string(),
  created_at: timestampSchema
});

export const notificationRowDtoSchema = z.object({
  id: idSchema,
  recipient_id: idSchema,
  type: z.enum(notificationTypes),
  title: z.string(),
  body: z.string(),
  read_at: timestampSchema.nullable(),
  created_at: timestampSchema
});

export const profileAccessUpdatesSchema = z.object({
  role: z.enum(userRoles).optional(),
  is_active: z.boolean().optional()
}).strict().refine((value) => value.role !== undefined || value.is_active !== undefined, {
  message: "At least one access update is required."
});

export type ResolveAssetByQrCodeInput = z.infer<typeof resolveAssetByQrCodeInputSchema>;
export type ListAdminAssetsInput = z.infer<typeof listAdminAssetsInputSchema>;
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
export type ProfileRowDtoInput = z.infer<typeof profileRowDtoSchema>;
export type AssetQrCodeRowDtoInput = z.infer<typeof assetQrCodeRowDtoSchema>;
export type InstructorAssetLookupDtoInput = z.infer<typeof instructorAssetLookupDtoSchema>;
export type AdminAssetRowDtoInput = z.infer<typeof adminAssetRowDtoSchema>;
export type BookingRowDtoInput = z.infer<typeof bookingRowDtoSchema>;
export type BookingRpcResultDtoInput = z.infer<typeof bookingRpcResultDtoSchema>;
export type DefectReportRowDtoInput = z.infer<typeof defectReportRowDtoSchema>;
export type DefectReportRpcResultDtoInput = z.infer<typeof defectReportRpcResultDtoSchema>;
export type TicketThreadRowDtoInput = z.infer<typeof ticketThreadRowDtoSchema>;
export type TicketMessageRowDtoInput = z.infer<typeof ticketMessageRowDtoSchema>;
export type NotificationRowDtoInput = z.infer<typeof notificationRowDtoSchema>;
export type ProfileAccessUpdatesInput = z.infer<typeof profileAccessUpdatesSchema>;
