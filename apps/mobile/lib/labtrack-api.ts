import {
  bookingRequestSchema,
  defectReportSchema,
  parseQrPayload,
  ticketMessageSchema,
  type AssetCondition,
  type AssetStatus,
  type BookingStatus,
  type DefectStatus,
  type Profile
} from "@labtrack/shared";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: Profile["role"];
  department: string | null;
  is_active: boolean;
};

type AssetLookupRow = {
  asset_id: string;
  property_number: string;
  serial_number: string | null;
  name: string;
  category_name: string;
  location_name: string;
  condition: AssetCondition;
  status: AssetStatus;
  active_qr_code: string;
  qr_generated_at: string;
};

type BookingRow = {
  id: string;
  asset_id: string;
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
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

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

export type MobileBooking = {
  id: string;
  assetId: string;
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

export async function getCurrentUserId() {
  const client = requireClient();
  const {
    data: { session },
    error
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return session?.user.id ?? null;
}

export async function getCurrentProfile() {
  const client = requireClient();
  const userId = await getCurrentUserId();

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

export async function signInWithPassword(email: string, password: string) {
  const client = requireClient();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

export async function signOut() {
  const client = requireClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function resolveAssetByPayload(payload: string) {
  const parsed = parseQrPayload(payload);

  if (!parsed) {
    throw new Error("This QR code is not a valid LABTRACK asset code.");
  }

  return resolveAssetByQrCode(parsed.code);
}

export async function resolveAssetByQrCode(code: string) {
  const client = requireClient();
  const { data, error } = await client.rpc("resolve_asset_by_qr_code", { p_qr_code: code });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return null;
  }

  return toAsset(row as AssetLookupRow);
}

export async function listMyBookings() {
  const client = requireClient();
  const { data, error } = await client
    .from("bookings")
    .select("id,asset_id,instructor_id,requested_start_at,requested_end_at,purpose,status,decision_notes,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as BookingRow[]).map(toBooking);
}

export async function createBooking(input: { assetId: string; requestedStartAt: string; requestedEndAt: string; purpose: string }) {
  const validation = bookingRequestSchema.safeParse(input);

  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Booking request is invalid.");
  }

  const client = requireClient();
  const { data, error } = await client.rpc("create_booking", {
    p_asset_id: validation.data.assetId,
    p_requested_start_at: validation.data.requestedStartAt,
    p_requested_end_at: validation.data.requestedEndAt,
    p_purpose: validation.data.purpose
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function cancelBooking(id: string) {
  const client = requireClient();
  const { error } = await client.rpc("cancel_booking", { p_booking_id: id });

  if (error) {
    throw error;
  }
}

export async function listMyDefectReports() {
  const client = requireClient();
  const { data, error } = await client
    .from("defect_reports")
    .select("id,asset_id,instructor_id,title,description,status,resolution_notes,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DefectRow[]).map(toDefectReport);
}

export async function createDefectReport(input: { assetId: string; title: string; description: string }) {
  const validation = defectReportSchema.safeParse(input);

  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Defect report is invalid.");
  }

  const client = requireClient();
  const { data, error } = await client.rpc("create_defect_report", {
    p_asset_id: validation.data.assetId,
    p_title: validation.data.title,
    p_description: validation.data.description
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function uploadDefectPhoto(reportId: string, uri: string) {
  const client = requireClient();
  const response = await fetch(uri);
  const blob = await response.blob();
  const fileName = `${reportId}/${Date.now()}.jpg`;
  const { error: uploadError } = await client.storage.from("defect-photos").upload(fileName, blob, { contentType: "image/jpeg" });

  if (uploadError) {
    throw uploadError;
  }

  const userId = await getCurrentUserId();

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

export async function listTicketThreads() {
  const client = requireClient();
  const { data, error } = await client
    .from("ticket_threads")
    .select("id,subject_type,booking_id,defect_report_id,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as TicketThreadRow[]).map(toTicketThread);
}

export async function listTicketMessages(threadId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("ticket_messages")
    .select("id,thread_id,sender_id,body,created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as TicketMessageRow[]).map(toTicketMessage);
}

export async function sendTicketMessage(threadId: string, body: string) {
  const validation = ticketMessageSchema.safeParse({ threadId, body });

  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message ?? "Message is invalid.");
  }

  const client = requireClient();
  const { error } = await client.rpc("send_ticket_message", {
    p_thread_id: validation.data.threadId,
    p_body: validation.data.body
  });

  if (error) {
    throw error;
  }
}

export async function listNotifications() {
  const client = requireClient();
  const { data, error } = await client
    .from("notifications")
    .select("id,type,title,body,read_at,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as NotificationRow[]).map(toNotification);
}

export async function markNotificationRead(id: string) {
  const client = requireClient();
  const { error } = await client.rpc("mark_notification_read", { p_notification_id: id });

  if (error) {
    throw error;
  }
}

export async function upsertPushToken(token: string) {
  const client = requireClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return;
  }

  const { error } = await client.from("device_push_tokens").upsert({
    user_id: userId,
    expo_push_token: token,
    platform: "android",
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

function toAsset(row: AssetLookupRow): MobileAsset {
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

function toBooking(row: BookingRow): MobileBooking {
  return {
    id: row.id,
    assetId: row.asset_id,
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
