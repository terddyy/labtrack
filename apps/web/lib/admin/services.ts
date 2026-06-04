import {
  assetSchema,
  buildQuickLoginAccounts,
  callRpc,
  getDashboardCounters,
  isCustodianRole,
  type AdminAssetRowDto,
  type BookingStatus,
  type Profile
} from "@labtrack/shared";
import { getSupabaseServerClient, hasSupabaseServerConfig } from "@/lib/supabase/server";
import type {
  AdminAccessState,
  AssetFormState,
  AssetView,
  ActivityLogFilters,
  ActivityLogRow,
  BorrowingMonitorFilters,
  BorrowingMonitorRow,
  CategoryRow,
  DashboardData,
  DefectRow,
  LocationRow,
  PrintableReportFilters,
  PrintableReportRow,
  ProfileAccessUpdates,
  ProfileRow,
  ReportFilters,
  TicketMessageRow,
  UsageAnalyticsRow
} from "./types";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;

const emptyDashboardData: DashboardData = {
  categories: [],
  locations: [],
  assets: [],
  bookings: [],
  defects: [],
  profiles: [],
  ticketThreads: [],
  counters: getDashboardCounters({ assets: [], bookings: [], defects: [] })
};

export function getEmptyDashboardData() {
  return emptyDashboardData;
}

export function getWebQuickLoginAccounts() {
  const nodeEnv: string = process.env.NODE_ENV;
  const demoLoginFlag = process.env.LABTRACK_ENABLE_DEMO_LOGINS ?? process.env.NEXT_PUBLIC_ENABLE_QUICK_LOGIN;

  if (demoLoginFlag === "false") {
    return [];
  }

  const includeDefaults = nodeEnv !== "production" || demoLoginFlag === "true";

  return buildQuickLoginAccounts({
    super_admin: {
      email: process.env.QUICK_LOGIN_SUPER_ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_EMAIL,
      password: process.env.QUICK_LOGIN_SUPER_ADMIN_PASSWORD ?? process.env.NEXT_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_PASSWORD
    },
    admin: {
      email: process.env.QUICK_LOGIN_ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_QUICK_LOGIN_ADMIN_EMAIL,
      password: process.env.QUICK_LOGIN_ADMIN_PASSWORD ?? process.env.NEXT_PUBLIC_QUICK_LOGIN_ADMIN_PASSWORD
    }
  }, { includeDefaults, roles: ["super_admin", "admin"] });
}

export async function getAdminAccess(): Promise<AdminAccessState> {
  if (!hasSupabaseServerConfig()) {
    return { status: "missing-config" };
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return { status: "missing-config" };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    return { status: "error", message: userError.message };
  }

  if (!user) {
    return { status: "signed-out" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,department,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { status: "error", message: error.message };
  }

  if (!data) {
    return { status: "error", message: "No LABTRACK profile exists for the signed-in user." };
  }

  const profile = toProfile(data as ProfileRow);

  if (!profile.isActive || !isCustodianRole(profile.role)) {
    return { status: "forbidden", profile };
  }

  return { status: "authorized", profile };
}

export async function getAdminDashboardData(): Promise<DashboardData> {
  const supabase = await requireAuthorizedAdminClient();
  const [
    categoriesResult,
    locationsResult,
    assetsResult,
    bookingsResult,
    defectsResult,
    profilesResult,
    threadsResult,
    assetCountResult,
    activeQrCountResult,
    pendingBookingsCountResult,
    openDefectsCountResult
  ] = await Promise.all([
    supabase.from("asset_categories").select("id,name").order("name"),
    supabase.from("locations").select("id,name").order("name"),
    callRpc(supabase, "listAdminAssets", { p_limit: 500, p_offset: 0 }),
    supabase
      .from("bookings")
      .select("id,resource_type,asset_id,location_id,instructor_id,purpose,status,requested_start_at,requested_end_at,decision_notes")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("defect_reports")
      .select("id,asset_id,instructor_id,title,description,status,resolution_notes,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id,email,full_name,role,department,is_active")
      .order("full_name"),
    supabase
      .from("ticket_threads")
      .select("id,subject_type,booking_id,defect_report_id,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("assets").select("id", { count: "exact", head: true }),
    supabase.from("asset_qr_codes").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("defect_reports").select("id", { count: "exact", head: true }).not("status", "in", "(resolved,rejected)")
  ]);

  const error = [
    categoriesResult.error,
    locationsResult.error,
    bookingsResult.error,
    defectsResult.error,
    profilesResult.error,
    threadsResult.error,
    assetCountResult.error,
    activeQrCountResult.error,
    pendingBookingsCountResult.error,
    openDefectsCountResult.error
  ].find(Boolean);

  if (error) {
    throw new Error(error.message);
  }

  const assets = assetsResult.map(toAssetView);
  const bookings = (bookingsResult.data ?? []) as DashboardData["bookings"];
  const defects = (defectsResult.data ?? []) as DefectRow[];
  const fallbackCounters = getDashboardCounters({ assets, bookings, defects });

  return {
    categories: (categoriesResult.data ?? []) as CategoryRow[],
    locations: (locationsResult.data ?? []) as LocationRow[],
    assets,
    bookings,
    defects,
    profiles: (profilesResult.data ?? []) as ProfileRow[],
    ticketThreads: (threadsResult.data ?? []) as DashboardData["ticketThreads"],
    counters: {
      ...fallbackCounters,
      registeredAssets: assetCountResult.count ?? fallbackCounters.registeredAssets,
      activeQrCodes: activeQrCountResult.count ?? fallbackCounters.activeQrCodes,
      pendingBookings: pendingBookingsCountResult.count ?? fallbackCounters.pendingBookings,
      openDefects: openDefectsCountResult.count ?? fallbackCounters.openDefects
    }
  };
}

export async function getTicketMessages(threadId: string | null): Promise<TicketMessageRow[]> {
  if (!threadId) {
    return [];
  }

  const supabase = await requireAuthorizedAdminClient();
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("id,thread_id,sender_id,body,created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TicketMessageRow[];
}

export async function getBorrowingMonitor(input: BorrowingMonitorFilters): Promise<BorrowingMonitorRow[]> {
  const supabase = await requireAuthorizedAdminClient();

  return callRpc(supabase, "getBorrowingMonitor", {
    p_from: input.from,
    p_to: input.to,
    p_location_id: input.locationId ?? null,
    p_resource_id: input.resourceId ?? null,
    p_statuses: normalizeStatuses(input.statuses)
  });
}

export async function getUsageAnalytics(input: ReportFilters): Promise<UsageAnalyticsRow[]> {
  const supabase = await requireAuthorizedAdminClient();

  return callRpc(supabase, "getUsageAnalytics", {
    p_from: input.from,
    p_to: input.to,
    p_location_id: input.locationId ?? null,
    p_asset_id: input.assetId ?? null
  });
}

export async function listActivityLogs(input: ActivityLogFilters): Promise<ActivityLogRow[]> {
  const supabase = await requireAuthorizedAdminClient();

  return callRpc(supabase, "listActivityLogs", {
    p_from: input.from ?? null,
    p_to: input.to ?? null,
    p_limit: input.limit ?? 100,
    p_offset: input.offset ?? 0
  });
}

export async function getPrintableReportData(input: PrintableReportFilters): Promise<PrintableReportRow[]> {
  const supabase = await requireAuthorizedAdminClient();

  return callRpc(supabase, "getPrintableReportData", {
    p_report_type: input.reportType,
    p_from: input.from,
    p_to: input.to,
    p_location_id: input.locationId ?? null,
    p_asset_id: input.assetId ?? null
  });
}

export async function createAsset(input: AssetFormState) {
  const supabase = await requireAuthorizedAdminClient();
  const profile = await requireAuthorizedAdminProfile();
  const normalized = {
    propertyNumber: input.propertyNumber.trim(),
    serialNumber: input.serialNumber.trim() || null,
    name: input.name.trim(),
    categoryId: input.categoryId,
    locationId: input.locationId,
    condition: input.condition,
    status: input.status
  };
  const validation = assetSchema.safeParse(normalized);

  if (!validation.success) {
    return { formErrors: validation.error.issues };
  }

  const { data, error } = await supabase
    .from("assets")
    .insert({
      property_number: validation.data.propertyNumber,
      serial_number: validation.data.serialNumber ?? null,
      name: validation.data.name,
      category_id: validation.data.categoryId,
      location_id: validation.data.locationId,
      condition: validation.data.condition,
      status: validation.data.status,
      notes: input.notes.trim() || null,
      created_by: profile.id
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { id: (data as { id: string }).id };
}

export async function generateAssetQr(assetId: string) {
  const supabase = await requireAuthorizedAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("property_number")
    .eq("id", assetId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await callRpc(supabase, "regenerateAssetQr", {
    p_asset_id: assetId,
    p_qr_code: createAssetQrCode((data as { property_number: string }).property_number)
  });
}

export async function decideBooking(bookingId: string, status: "approved" | "rejected") {
  const supabase = await requireAuthorizedAdminClient();

  await callRpc(supabase, "decideBorrowing", {
    p_borrowing_id: bookingId,
    p_status: status,
    p_notes: status === "approved" ? "Approved from LABTRACK custodian." : "Rejected from LABTRACK custodian."
  });
}

export async function checkoutBooking(bookingId: string) {
  const supabase = await requireAuthorizedAdminClient();

  await callRpc(supabase, "checkoutBorrowing", {
    p_borrowing_id: bookingId,
    p_notes: "Checked out from LABTRACK custodian."
  });
}

export async function returnBooking(bookingId: string) {
  const supabase = await requireAuthorizedAdminClient();

  await callRpc(supabase, "returnBorrowing", {
    p_borrowing_id: bookingId,
    p_notes: "Returned from LABTRACK custodian."
  });
}

export async function cancelBooking(bookingId: string) {
  const supabase = await requireAuthorizedAdminClient();

  await callRpc(supabase, "cancelBorrowing", { p_borrowing_id: bookingId });
}

export async function triageDefectReport(defectReportId: string, status: "under_review" | "sent_for_repair" | "resolved" | "rejected", label: string) {
  const supabase = await requireAuthorizedAdminClient();

  await callRpc(supabase, "triageDefectReport", {
    p_defect_report_id: defectReportId,
    p_status: status,
    p_notes: `Marked ${label} from LABTRACK admin.`
  });
}

export async function sendTicketMessage(threadId: string, body: string) {
  const supabase = await requireAuthorizedAdminClient();

  await callRpc(supabase, "sendTicketMessage", {
    p_thread_id: threadId,
    p_body: body
  });
}

export async function updateProfileAccess(profileId: string, updates: ProfileAccessUpdates) {
  const supabase = await requireAuthorizedAdminClient();
  const currentProfile = await requireAuthorizedAdminProfile();

  if (currentProfile.role !== "super_admin") {
    throw new Error("Only Super Admin accounts can manage account access.");
  }

  const allowedUpdates: ProfileAccessUpdates = {};

  if (updates.role !== undefined) {
    allowedUpdates.role = updates.role;
  }

  if (updates.is_active !== undefined) {
    allowedUpdates.is_active = updates.is_active;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    throw new Error("At least one access update is required.");
  }

  if (profileId === currentProfile.id && (allowedUpdates.is_active === false || (allowedUpdates.role && allowedUpdates.role !== "super_admin"))) {
    throw new Error("You cannot remove your own active super admin access.");
  }

  const { error } = await supabase.from("profiles").update(allowedUpdates).eq("id", profileId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createCategory(name: string) {
  const supabase = await requireAuthorizedAdminClient();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Category name is required.");
  }

  const { error } = await supabase.from("asset_categories").insert({ name: trimmedName });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createLocation(name: string) {
  const supabase = await requireAuthorizedAdminClient();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Location name is required.");
  }

  const { error } = await supabase.from("locations").insert({ name: trimmedName });

  if (error) {
    throw new Error(error.message);
  }
}

async function requireAuthorizedAdminClient(): Promise<SupabaseServerClient> {
  const access = await getAdminAccess();

  if (access.status !== "authorized") {
    throw new Error(access.status === "error" ? access.message : "Active Custodian access is required.");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase public configuration is missing.");
  }

  return supabase;
}

async function requireAuthorizedAdminProfile() {
  const access = await getAdminAccess();

  if (access.status !== "authorized") {
    throw new Error(access.status === "error" ? access.message : "Active Custodian access is required.");
  }

  return access.profile;
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

function normalizeStatuses(statuses: BorrowingMonitorFilters["statuses"]): BookingStatus[] | null {
  return statuses?.length ? statuses : null;
}

function toAssetView(row: AdminAssetRowDto): AssetView {
  return {
    id: row.id,
    propertyNumber: row.property_number,
    serialNumber: row.serial_number,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    locationId: row.location_id,
    locationName: row.location_name,
    condition: row.condition,
    status: row.status,
    notes: row.notes,
    activeQr: row.active_qr_code_id && row.active_qr_code && row.active_qr_generated_at
      ? {
          id: row.active_qr_code_id,
          asset_id: row.id,
          code: row.active_qr_code,
          generated_at: row.active_qr_generated_at
        }
      : null
  };
}

function createAssetQrCode(propertyNumber: string) {
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  const suffix = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const normalizedProperty = propertyNumber.replace(/[^A-Z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase();

  return `ASSET-${normalizedProperty}-${suffix}`;
}
