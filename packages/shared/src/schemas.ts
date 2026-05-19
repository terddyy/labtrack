import { z } from "zod";
import { assetConditions, assetStatuses, bookingStatuses, defectStatuses, userRoles } from "./statuses";

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
