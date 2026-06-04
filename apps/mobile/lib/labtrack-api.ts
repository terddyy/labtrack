import {
  bookingRequestSchema,
  callRpc,
  defectReportSchema,
  parseQrPayload,
  ticketMessageSchema,
  type AssetCondition,
  type AssetStatus,
  type AvailabilityState,
  type BorrowingResourceRowDto,
  type BorrowingRowDto,
  type BookingStatus,
  type DefectStatus,
  type InstructorAssetLookupDto,
  type NotificationType,
  type Profile,
  type ResourceScheduleEntryRowDto,
  type ResourceType
} from "@labtrack/shared";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: Profile["role"];
  department: string | null;
  is_active: boolean;
};

type BookingRow = {
  id: string;
  resource_type: ResourceType | null;
  asset_id: string | null;
  location_id: string | null;
  instructor_id: string;
  requested_start_at: string;
  requested_end_at: string;
  purpose: string;
  status: BookingStatus;
  decision_notes: string | null;
  created_at: string;
};

type DefectRow = {
  id: string;
  asset_id: string;
  instructor_id: string;
  title: string;
  description: string;
  status: DefectStatus;
  resolution_notes: string | null;
  created_at: string;
};

type TicketThreadRow = {
  id: string;
  subject_type: "booking" | "defect_report";
  booking_id: string | null;
  defect_report_id: string | null;
  created_at: string;
};

type TicketMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type MobileListOptions = {
  limit?: number;
  offset?: number;
};

export type MobileDashboardSummary = {
  availableAssets: number;
  bookings: number;
  checkedOutAssets: number;
  labCount: number;
  openDefects: number;
  pendingBookings: number;
  repairAssets: number;
  threads: number;
  totalAssets: number;
  unreadNotifications: number;
};

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

export type MobileAsset = {
  id: string;
  propertyNumber: string;
  serialNumber: string | null;
  name: string;
  categoryName: string;
  locationName: string;
  condition: AssetCondition;
  status: AssetStatus;
  activeQrCode: string;
  qrGeneratedAt: string;
  };

export type MobileBorrowingResource = {
  id: string;
  resourceType: ResourceType;
  name: string;
  categoryName: string | null;
  locationId: string | null;
  locationName: string | null;
  condition: AssetCondition | null;
  status: AssetStatus | null;
  availability: AvailabilityState;
  nextAvailableAt: string | null;
  primaryImageUrl: string | null;
  isActive: boolean;
  isArchived: boolean;
};

export type MobileResourceScheduleEntry = {
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

export type MobileBorrowing = {
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

export type MobileBooking = {
  id: string;
  resourceType: ResourceType;
  assetId: string | null;
  roomId: string | null;
  instructorId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  purpose: string;
  status: BookingStatus;
  decisionNotes: string | null;
  createdAt: string;
};

export type MobileDefectReport = {
  id: string;
  assetId: string;
  instructorId: string;
  title: string;
  description: string;
  status: DefectStatus;
  resolutionNotes: string | null;
  createdAt: string;
};

export type MobileTicketThread = {
  id: string;
  subjectType: "booking" | "defect_report";
  bookingId: string | null;
  defectReportId: string | null;
  createdAt: string;
};

export type MobileTicketMessage = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type MobileNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function hasSupabaseConfig() {
  return supabase !== null;
}

export function formatApiError(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The request could not be completed.";
}

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase configuration is missing.");
  }

  return supabase;
}

type LabtrackMobileClient = ReturnType<typeof requireClient>;

export function createLabtrackMobileApi(client: LabtrackMobileClient) {
  return {
    cancelBooking: (id: string) => cancelBooking(id, client),
    createBooking: (input: { assetId: string; requestedStartAt: string; requestedEndAt: string; purpose: string }) => createBooking(input, client),
    createDefectReport: (input: { assetId: string; title: string; description: string }) => createDefectReport(input, client),
    getCurrentProfile: () => getCurrentProfile(client),
    getCurrentUserId: () => getCurrentUserId(client),
    getDashboardSummary: () => getDashboardSummary(client),
    listBorrowableResources: (input: ListBorrowableResourcesOptions) => listBorrowableResources(input, client),
    listResourceSchedule: (input: ListResourceScheduleOptions) => listResourceSchedule(input, client),
    createBorrowing: (input: CreateBorrowingOptions) => createBorrowing(input, client),
    checkoutBorrowing: (id: string, notes?: string | null) => checkoutBorrowing(id, notes, client),
    getBorrowingMonitor: (input: BorrowingMonitorOptions) => getBorrowingMonitor(input, client),
    returnBorrowing: (id: string, notes?: string | null) => returnBorrowing(id, notes, client),
    listMyBookings: (options?: MobileListOptions) => listMyBookings(options, client),
    listMyDefectReports: (options?: MobileListOptions) => listMyDefectReports(options, client),
    listNotifications: (options?: MobileListOptions) => listNotifications(options, client),
    listTicketMessages: (threadId: string, options?: MobileListOptions) => listTicketMessages(threadId, options, client),
    listTicketThreads: (options?: MobileListOptions) => listTicketThreads(options, client),
    markNotificationRead: (id: string) => markNotificationRead(id, client),
    resolveAssetByPayload: (payload: string) => resolveAssetByPayload(payload, client),
    resolveAssetByQrCode: (code: string) => resolveAssetByQrCode(code, client),
    sendTicketMessage: (threadId: string, body: string) => sendTicketMessage(threadId, body, client),
    signInWithPassword: (email: string, password: string) => signInWithPassword(email, password, client),
    signUpWithPassword: (email: string, password: string, fullName: string) => signUpWithPassword(email, password, fullName, client),
    signOut: () => signOut(client),
    uploadDefectPhoto: (reportId: string, uri: string) => uploadDefectPhoto(reportId, uri, client),
    upsertPushToken: (token: string) => upsertPushToken(token, client)
  };
}

export type ListBorrowableResourcesOptions = {
  startAt: string;
  endAt: string;
  resourceType?: ResourceType | null;
  locationId?: string | null;
  query?: string | null;
};

export type ListResourceScheduleOptions = {
  resourceType: ResourceType;
  resourceId: string;
  from: string;
  to: string;
};

export type CreateBorrowingOptions = {
  resourceType: ResourceType;
  resourceId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  purpose: string;
};

export type BorrowingMonitorOptions = {
  from: string;
  to: string;
  locationId?: string | null;
  resourceId?: string | null;
  statuses?: BookingStatus[] | null;
};

export async function getCurrentUserId(client = requireClient()) {
  const {
    data: { session },
    error
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return session?.user.id ?? null;
}

export async function getCurrentProfile(client = requireClient()) {
  const userId = await getCurrentUserId(client);

  if (!userId) {
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("id,email,full_name,role,department,is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toProfile(data as ProfileRow) : null;
}

export async function signInWithPassword(email: string, password: string, client = requireClient()) {
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

export async function signUpWithPassword(email: string, password: string, fullName: string, client = requireClient()) {
  const trimmedFullName = fullName.trim();

  if (!trimmedFullName) {
    throw new Error("Full name is required.");
  }

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: trimmedFullName
      }
    }
  });

  if (error) {
    throw error;
  }

  return { signedIn: Boolean(data.session) };
}

export async function signOut(client = requireClient()) {
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function resolveAssetByPayload(payload: string, client = requireClient()) {
  const parsed = parseQrPayload(payload);

  if (!parsed) {
    throw new Error("This QR code is not a valid LABTRACK asset code.");
  }

  return resolveAssetByQrCode(parsed.code, client);
}

export async function resolveAssetByQrCode(code: string, client = requireClient()) {
  const data = await callRpc(client, "resolveAssetByQrCode", { p_qr_code: code });
  const row = data[0];

  if (!row) {
    return null;
  }

  return toAsset(row);
}

export async function listBorrowableResources(input: ListBorrowableResourcesOptions, client = requireClient()) {
  const data = await callRpc(client, "listBorrowableResources", {
    p_start_at: input.startAt,
    p_end_at: input.endAt,
    p_resource_type: input.resourceType ?? null,
    p_location_id: input.locationId ?? null,
    p_query: input.query?.trim() || null
  });

  return data.map(toBorrowingResource);
}

export async function listResourceSchedule(input: ListResourceScheduleOptions, client = requireClient()) {
  const data = await callRpc(client, "listResourceSchedule", {
    p_resource_type: input.resourceType,
    p_resource_id: input.resourceId,
    p_from: input.from,
    p_to: input.to
  });

  return data.map(toScheduleEntry);
}

export async function createBorrowing(input: CreateBorrowingOptions, client = requireClient()) {
  const data = await callRpc(client, "createBorrowing", {
    p_resource_type: input.resourceType,
    p_resource_id: input.resourceId,
    p_requested_start_at: input.requestedStartAt,
    p_requested_end_at: input.requestedEndAt,
    p_purpose: input.purpose
  });

  return data.map(toBorrowing);
}

export async function checkoutBorrowing(id: string, notes: string | null = null, client = requireClient()) {
  return toBorrowing(firstBorrowingRow(await callRpc(client, "checkoutBorrowing", { p_borrowing_id: id, p_notes: notes })));
}

export async function getBorrowingMonitor(input: BorrowingMonitorOptions, client = requireClient()) {
  const data = await callRpc(client, "getBorrowingMonitor", {
    p_from: input.from,
    p_to: input.to,
    p_location_id: input.locationId ?? null,
    p_resource_id: input.resourceId ?? null,
    p_statuses: input.statuses ?? null
  });

  return data.map(toBorrowing);
}

export async function returnBorrowing(id: string, notes: string | null = null, client = requireClient()) {
  return toBorrowing(firstBorrowingRow(await callRpc(client, "returnBorrowing", { p_borrowing_id: id, p_notes: notes })));
}

export async function getDashboardSummary(client = requireClient()): Promise<MobileDashboardSummary> {
  const [
    bookingsCount,
    pendingBookingsCount,
    openDefectsCount,
    threadsCount,
    unreadNotificationsCount,
    totalAssetsCount,
    availableAssetsCount,
    checkedOutAssetsCount,
    repairAssetsCount,
    labCount
  ] = await Promise.all([
    countRows(client.from("bookings").select("id", { count: "exact", head: true })),
    countRows(client.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending")),
    countRows(client.from("defect_reports").select("id", { count: "exact", head: true }).not("status", "in", "(resolved,rejected)")),
    countRows(client.from("ticket_threads").select("id", { count: "exact", head: true })),
    countRows(client.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)),
    countRows(client.from("assets").select("id", { count: "exact", head: true }).neq("status", "retired")),
    countRows(client.from("assets").select("id", { count: "exact", head: true }).eq("status", "available")),
    countRows(client.from("assets").select("id", { count: "exact", head: true }).eq("status", "checked_out")),
    countRows(client.from("assets").select("id", { count: "exact", head: true }).or("status.eq.for_repair,condition.in.(defective,for_repair)")),
    safeCountRows(client.from("locations").select("id", { count: "exact", head: true }))
  ]);

  return {
    availableAssets: availableAssetsCount,
    bookings: bookingsCount,
    checkedOutAssets: checkedOutAssetsCount,
    labCount,
    openDefects: openDefectsCount,
    pendingBookings: pendingBookingsCount,
    repairAssets: repairAssetsCount,
    threads: threadsCount,
    totalAssets: totalAssetsCount,
    unreadNotifications: unreadNotificationsCount
  };
}

export async function listMyBookings(options: MobileListOptions = {}, client = requireClient()) {
  const { limit, offset } = normalizeListOptions(options);
  const { data, error } = await client
    .from("bookings")
    .select("id,resource_type,asset_id,location_id,instructor_id,requested_start_at,requested_end_at,purpose,status,decision_notes,created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return ((data ?? []) as BookingRow[]).map(toBooking);
}

export async function createBooking(input: { assetId: string; requestedStartAt: string; requestedEndAt: string; purpose: string }, client = requireClient()) {
  const validation = bookingRequestSchema.safeParse(input);

  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Borrow request is invalid.");
  }

  if (!validation.data.assetId) {
    throw new Error("Asset borrowing requires an asset id.");
  }

  return callRpc(client, "createBooking", {
    p_asset_id: validation.data.assetId,
    p_requested_start_at: validation.data.requestedStartAt,
    p_requested_end_at: validation.data.requestedEndAt,
    p_purpose: validation.data.purpose
  });
}

export async function cancelBooking(id: string, client = requireClient()) {
  await callRpc(client, "cancelBorrowing", { p_borrowing_id: id });
}

export async function listMyDefectReports(options: MobileListOptions = {}, client = requireClient()) {
  const { limit, offset } = normalizeListOptions(options);
  const { data, error } = await client
    .from("defect_reports")
    .select("id,asset_id,instructor_id,title,description,status,resolution_notes,created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return ((data ?? []) as DefectRow[]).map(toDefectReport);
}

export async function createDefectReport(input: { assetId: string; title: string; description: string }, client = requireClient()) {
  const validation = defectReportSchema.safeParse(input);

  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Defect report is invalid.");
  }

  return callRpc(client, "createDefectReport", {
    p_asset_id: validation.data.assetId,
    p_title: validation.data.title,
    p_description: validation.data.description
  });
}

export async function uploadDefectPhoto(reportId: string, uri: string, client = requireClient()) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileName = `${reportId}/${Date.now()}.jpg`;
  const { error: uploadError } = await client.storage.from("defect-photos").upload(fileName, blob, { contentType: "image/jpeg" });

  if (uploadError) {
    throw uploadError;
  }

  const userId = await getCurrentUserId(client);

  if (!userId) {
    throw new Error("Sign in before uploading defect photos.");
  }

  const { error } = await client.from("defect_photos").insert({
    defect_report_id: reportId,
    storage_path: fileName,
    uploaded_by: userId
  });

  if (error) {
    throw error;
  }
}

export async function listTicketThreads(options: MobileListOptions = {}, client = requireClient()) {
  const { limit, offset } = normalizeListOptions(options);
  const { data, error } = await client
    .from("ticket_threads")
    .select("id,subject_type,booking_id,defect_report_id,created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return ((data ?? []) as TicketThreadRow[]).map(toTicketThread);
}

export async function listTicketMessages(threadId: string, options: MobileListOptions = {}, client = requireClient()) {
  const { limit, offset } = normalizeListOptions(options);
  const { data, error } = await client
    .from("ticket_messages")
    .select("id,thread_id,sender_id,body,created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return ((data ?? []) as TicketMessageRow[]).map(toTicketMessage);
}

export async function sendTicketMessage(threadId: string, body: string, client = requireClient()) {
  const validation = ticketMessageSchema.safeParse({ threadId, body });

  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Message is invalid.");
  }

  await callRpc(client, "sendTicketMessage", {
    p_thread_id: validation.data.threadId,
    p_body: validation.data.body
  });
}

export async function listNotifications(options: MobileListOptions = {}, client = requireClient()) {
  const { limit, offset } = normalizeListOptions(options);
  const { data, error } = await client
    .from("notifications")
    .select("id,type,title,body,read_at,created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return ((data ?? []) as NotificationRow[]).map(toNotification);
}

export async function markNotificationRead(id: string, client = requireClient()) {
  await callRpc(client, "markNotificationRead", { p_notification_id: id });
}

export async function upsertPushToken(token: string, client = requireClient()) {
  const userId = await getCurrentUserId(client);

  if (!userId) {
    return;
  }

  const { error } = await client.from("device_push_tokens").upsert({
    user_id: userId,
    expo_push_token: token,
    platform: Platform.OS,
    last_seen_at: new Date().toISOString()
  }, { onConflict: "expo_push_token" });

  if (error) {
    throw error;
  }
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    department: row.department,
    isActive: row.is_active
  };
}

async function countRows(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function safeCountRows(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  try {
    return await countRows(query);
  } catch {
    return 0;
  }
}

function normalizeListOptions(options: MobileListOptions) {
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT));
  const offset = Math.max(0, options.offset ?? 0);

  return { limit, offset };
}

function toAsset(row: InstructorAssetLookupDto): MobileAsset {
  return {
    id: row.asset_id,
    propertyNumber: row.property_number,
    serialNumber: row.serial_number,
    name: row.name,
    categoryName: row.category_name,
    locationName: row.location_name,
    condition: row.condition,
    status: row.status,
    activeQrCode: row.active_qr_code,
    qrGeneratedAt: row.qr_generated_at
  };
}

function toBorrowingResource(row: BorrowingResourceRowDto): MobileBorrowingResource {
  return {
    id: row.id,
    resourceType: row.resource_type,
    name: row.name,
    categoryName: row.category_name,
    locationId: row.location_id,
    locationName: row.location_name,
    condition: row.condition,
    status: row.status,
    availability: row.availability,
    nextAvailableAt: row.next_available_at,
    primaryImageUrl: row.primary_image_url,
    isActive: row.is_active,
    isArchived: row.is_archived
  };
}

function toScheduleEntry(row: ResourceScheduleEntryRowDto): MobileResourceScheduleEntry {
  return {
    id: row.id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    borrowerId: row.borrower_id,
    borrowerName: row.borrower_name,
    borrowerEmail: row.borrower_email,
    requestedStartAt: row.requested_start_at,
    requestedEndAt: row.requested_end_at,
    status: row.status,
    purpose: row.purpose,
    availability: row.availability
  };
}

function firstBorrowingRow(rows: BorrowingRowDto[]): BorrowingRowDto {
  const row = rows[0];

  if (!row) {
    throw new Error("Borrowing workflow did not return a borrowing row.");
  }

  return row;
}

function toBorrowing(row: BorrowingRowDto): MobileBorrowing {
  return {
    id: row.id,
    resourceType: row.resource_type,
    assetId: row.asset_id,
    roomId: row.room_id,
    borrowerId: row.borrower_id,
    borrowerName: row.borrower_name,
    borrowerEmail: row.borrower_email,
    requestedStartAt: row.requested_start_at,
    requestedEndAt: row.requested_end_at,
    purpose: row.purpose,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toBooking(row: BookingRow): MobileBooking {
  return {
    id: row.id,
    resourceType: row.resource_type ?? "asset",
    assetId: row.asset_id,
    roomId: row.location_id,
    instructorId: row.instructor_id,
    requestedStartAt: row.requested_start_at,
    requestedEndAt: row.requested_end_at,
    purpose: row.purpose,
    status: row.status,
    decisionNotes: row.decision_notes,
    createdAt: row.created_at
  };
}

function toDefectReport(row: DefectRow): MobileDefectReport {
  return {
    id: row.id,
    assetId: row.asset_id,
    instructorId: row.instructor_id,
    title: row.title,
    description: row.description,
    status: row.status,
    resolutionNotes: row.resolution_notes,
    createdAt: row.created_at
  };
}

function toTicketThread(row: TicketThreadRow): MobileTicketThread {
  return {
    id: row.id,
    subjectType: row.subject_type,
    bookingId: row.booking_id,
    defectReportId: row.defect_report_id,
    createdAt: row.created_at
  };
}

function toTicketMessage(row: TicketMessageRow): MobileTicketMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at
  };
}

function toNotification(row: NotificationRow): MobileNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at
  };
}
