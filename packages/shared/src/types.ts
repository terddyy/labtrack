import type { AssetCondition, AssetStatus, BookingStatus, DefectStatus, NotificationType, UserRole } from "./statuses.js";

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string | null;
  isActive: boolean;
};

export type Asset = {
  id: string;
  propertyNumber: string;
  serialNumber?: string | null;
  name: string;
  categoryName: string;
  locationName: string;
  condition: AssetCondition;
  status: AssetStatus;
  activeQrCode: string;
};

export type Booking = {
  id: string;
  assetId: string;
  instructorId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  purpose: string;
  status: BookingStatus;
};

export type ResourceType = "asset" | "room";
export type AvailabilityState = "available" | "tentative" | "busy" | "unavailable";
export type BorrowerQrPickupState =
  | "ready"
  | "waiting_approval"
  | "not_ready"
  | "reserved_by_other"
  | "already_checked_out"
  | "no_reservation"
  | "unavailable";
export type ReportType =
  | "asset_management_summary"
  | "borrowing_transactions"
  | "defect_reports"
  | "inventory"
  | "equipment_utilization";

export type BorrowingResource = {
  id: string;
  resourceType: ResourceType;
  name: string;
  categoryName: string | null;
  locationId: string | null;
  locationName: string | null;
  status: AssetStatus | null;
  condition: AssetCondition | null;
  availability: AvailabilityState;
  nextAvailableAt: string | null;
  primaryImageUrl: string | null;
  isActive: boolean;
  isArchived: boolean;
};

export type ResourceScheduleEntry = {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  borrowerId: string;
  borrowerName: string | null;
  borrowerEmail: string | null;
  requestedStartAt: string;
  requestedEndAt: string;
  status: BookingStatus;
  purpose: string;
  availability: Exclude<AvailabilityState, "available">;
};

export type BorrowingRow = {
  id: string;
  resourceType: ResourceType;
  assetId: string | null;
  roomId: string | null;
  borrowerId: string;
  borrowerName: string | null;
  borrowerEmail: string | null;
  requestedStartAt: string;
  requestedEndAt: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
};

export type DefectReport = {
  id: string;
  assetId: string;
  instructorId: string;
  title: string;
  description: string;
  status: DefectStatus;
};

export type TicketMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type TicketSubjectType = "booking" | "defect_report" | "general";

export type ProfileRowDto = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AssetQrCodeRowDto = {
  id: string;
  asset_id: string;
  code: string;
  is_active: boolean;
  generated_by: string | null;
  generated_at: string;
  invalidated_at: string | null;
  invalidated_by: string | null;
};

export type AdminAssetRowDto = {
  id: string;
  property_number: string;
  serial_number: string | null;
  name: string;
  category_id: string;
  category_name: string;
  location_id: string;
  location_name: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  active_qr_code_id: string | null;
  active_qr_code: string | null;
  active_qr_generated_at: string | null;
  primary_image_url: string | null;
};

export type InstructorAssetLookupDto = {
  asset_id: string;
  property_number: string;
  serial_number: string | null;
  name: string;
  category_id: string;
  category_name: string;
  location_id: string;
  location_name: string;
  condition: AssetCondition;
  status: AssetStatus;
  qr_code_id: string;
  active_qr_code: string;
  qr_generated_at: string;
  primary_image_url: string | null;
};

export type BookingRpcResultDto = {
  booking_id: string;
  ticket_thread_id: string;
  asset_id: string;
  instructor_id: string;
  requested_start_at: string;
  requested_end_at: string;
  purpose: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
};

export type DefectReportRpcResultDto = {
  defect_report_id: string;
  ticket_thread_id: string;
  asset_id: string;
  instructor_id: string;
  title: string;
  description: string;
  status: DefectStatus;
  created_at: string;
  updated_at: string;
};

export type BookingRowDto = {
  id: string;
  asset_id: string;
  instructor_id: string;
  requested_start_at: string;
  requested_end_at: string;
  purpose: string;
  status: BookingStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DefectReportRowDto = {
  id: string;
  asset_id: string;
  instructor_id: string;
  title: string;
  description: string;
  status: DefectStatus;
  triaged_by: string | null;
  triaged_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketThreadRowDto = {
  id: string;
  subject_type: TicketSubjectType;
  booking_id: string | null;
  defect_report_id: string | null;
  requester_id?: string | null;
  subject?: string | null;
  created_at: string;
};

export type TicketMessageRowDto = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type NotificationRowDto = {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type BorrowingResourceRowDto = {
  id: string;
  resource_type: ResourceType;
  name: string;
  category_name: string | null;
  location_id: string | null;
  location_name: string | null;
  status: AssetStatus | null;
  condition: AssetCondition | null;
  availability: AvailabilityState;
  next_available_at: string | null;
  primary_image_url: string | null;
  is_active: boolean;
  is_archived: boolean;
};

export type ResourceScheduleEntryRowDto = {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  borrower_id: string;
  borrower_name: string | null;
  borrower_email: string | null;
  requested_start_at: string;
  requested_end_at: string;
  status: BookingStatus;
  purpose: string;
  availability: Exclude<AvailabilityState, "available">;
};

export type BorrowingRowDto = {
  id: string;
  resource_type: ResourceType;
  asset_id: string | null;
  room_id: string | null;
  borrower_id: string;
  borrower_name: string | null;
  borrower_email: string | null;
  requested_start_at: string;
  requested_end_at: string;
  purpose: string;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
};

export type BorrowerQrPickupRowDto = {
  state: BorrowerQrPickupState;
  borrowing_id: string | null;
  asset_id: string | null;
  borrower_id: string | null;
  borrower_name: string | null;
  borrower_email: string | null;
  status: BookingStatus | null;
  requested_start_at: string | null;
  requested_end_at: string | null;
  purpose: string | null;
  message: string;
};

export type UsageAnalyticsRowDto = {
  report_type: ReportType;
  metric: string;
  label: string;
  value: number;
  unit: string;
};

export type ActivityLogRowDto = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PrintableReportRowDto = {
  report_type: ReportType;
  section: string;
  payload: Record<string, unknown> | Record<string, unknown>[];
};
