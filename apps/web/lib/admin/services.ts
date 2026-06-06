import {
  assetSchema,
  buildQuickLoginAccounts,
  callRpc,
  getDashboardCounters,
  isCustodianRole,
  normalizeEmailDomain,
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
  EmailDomainRule,
  LocationRow,
  PrintableReportFilters,
  PrintableReportRow,
  ProfileAccessUpdates,
  ProfileRow,
  RegistrationPolicy,
  ReportFilters,
  TicketMessageRow,
  UsageAnalyticsRow
} from "./types";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;
type RegistrationSettingsRow = {
  restrict_signup_to_allowed_domains: boolean;
};
type SupabaseReadResult<T> = {
  data: T | null;
  error: { message: string } | null;
};
type SupabaseCountResult = {
  count: number | null;
  error: { message: string } | null;
};

const ASSET_IMAGE_BUCKET = "asset-images";
const ASSET_IMAGE_SIGNED_URL_TTL_SECONDS = 60 * 60;
const ASSET_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ASSET_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ASSET_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const emptyDashboardData: DashboardData = {
  categories: [],
  locations: [],
  assets: [],
  bookings: [],
  defects: [],
  profiles: [],
  registrationPolicy: {
    restrictSignupToAllowedDomains: true,
    allowedDomains: []
  },
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
    if (isMissingSessionError(userError)) {
      return { status: "signed-out" };
    }

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
    categories,
    locations,
    assetRows,
    bookings,
    defects,
    profiles,
    registrationSettings,
    emailDomains,
    ticketThreads,
    assetCount,
    activeQrCount,
    pendingBookingsCount,
    openDefectsCount
  ] = await Promise.all([
    readDashboardQuery<CategoryRow[]>("asset_categories.list", supabase.from("asset_categories").select("id,name").order("name"), []),
    readDashboardQuery<LocationRow[]>("locations.list", supabase.from("locations").select("id,name").order("name"), []),
    readDashboardValue<AdminAssetRowDto[]>("rpc.listAdminAssets", () => callRpc(supabase, "listAdminAssets", { p_limit: 500, p_offset: 0 }), []),
    readDashboardQuery<DashboardData["bookings"]>(
      "bookings.recent",
      supabase
        .from("bookings")
        .select("id,resource_type,asset_id,location_id,instructor_id,purpose,status,requested_start_at,requested_end_at,decision_notes")
        .order("created_at", { ascending: false })
        .limit(50),
      []
    ),
    readDashboardQuery<DefectRow[]>(
      "defect_reports.recent",
      supabase
        .from("defect_reports")
        .select("id,asset_id,instructor_id,title,description,status,resolution_notes,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      []
    ),
    readDashboardQuery<ProfileRow[]>(
      "profiles.list",
      supabase
        .from("profiles")
        .select("id,email,full_name,role,department,is_active")
        .order("full_name"),
      []
    ),
    readDashboardQuery<RegistrationSettingsRow | null>(
      "registration_settings.current",
      supabase
        .from("registration_settings")
        .select("restrict_signup_to_allowed_domains")
        .eq("id", true)
        .maybeSingle(),
      null
    ),
    readDashboardQuery<EmailDomainRule[]>(
      "university_email_domains.list",
      supabase
        .from("university_email_domains")
        .select("id,domain,is_allowed,notes,created_at")
        .order("domain"),
      []
    ),
    readDashboardQuery<DashboardData["ticketThreads"]>(
      "ticket_threads.recent",
      supabase
        .from("ticket_threads")
        .select("id,subject_type,booking_id,defect_report_id,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      []
    ),
    readDashboardCount("assets.count", supabase.from("assets").select("id", { count: "exact", head: true })),
    readDashboardCount("asset_qr_codes.active_count", supabase.from("asset_qr_codes").select("id", { count: "exact", head: true }).eq("is_active", true)),
    readDashboardCount("bookings.pending_count", supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending")),
    readDashboardCount("defect_reports.open_count", supabase.from("defect_reports").select("id", { count: "exact", head: true }).not("status", "in", "(resolved,rejected)"))
  ]);

  const assets = await readDashboardValue<AssetView[]>(
    "asset_images.signed_urls",
    () => Promise.all(assetRows.map((row) => toAssetView(row, supabase))),
    []
  );
  const fallbackCounters = getDashboardCounters({ assets, bookings, defects });

  return {
    categories,
    locations,
    assets,
    bookings,
    defects,
    profiles,
    registrationPolicy: toRegistrationPolicy(
      registrationSettings,
      emailDomains
    ),
    ticketThreads,
    counters: {
      ...fallbackCounters,
      registeredAssets: assetCount ?? fallbackCounters.registeredAssets,
      activeQrCodes: activeQrCount ?? fallbackCounters.activeQrCodes,
      pendingBookings: pendingBookingsCount ?? fallbackCounters.pendingBookings,
      openDefects: openDefectsCount ?? fallbackCounters.openDefects
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
  const imageError = validateAssetImageFile(input.imageFile);
  const assetId = crypto.randomUUID();
  const identifiers = createAssetIdentifiers(assetId);
  const normalized = {
    propertyNumber: identifiers.propertyNumber,
    serialNumber: identifiers.serialNumber,
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

  if (imageError) {
    return { formErrors: [imageError] };
  }

  let assetWasInserted = false;
  let uploadedImagePath: string | null = null;

  try {
    const { error } = await supabase
      .from("assets")
      .insert({
        id: assetId,
        property_number: validation.data.propertyNumber,
        serial_number: validation.data.serialNumber ?? null,
        name: validation.data.name,
        category_id: validation.data.categoryId,
        location_id: validation.data.locationId,
        condition: validation.data.condition,
        status: validation.data.status,
        notes: input.notes.trim() || null,
        created_by: profile.id
      });

    if (error) {
      throw new Error(error.message);
    }

    assetWasInserted = true;

    if (input.imageFile) {
      uploadedImagePath = await uploadAssetPrimaryImage({
        altText: `${validation.data.name} image`,
        assetId,
        file: input.imageFile,
        profileId: profile.id,
        supabase
      });
    }
  } catch (error) {
    await cleanupFailedAssetCreate({ assetId, assetWasInserted, imagePath: uploadedImagePath, supabase });
    throw error;
  }

  return { id: assetId };
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

export async function updateRegistrationPolicy(restrictSignupToAllowedDomains: boolean) {
  const supabase = await requireAuthorizedAdminClient();
  const currentProfile = await requireAuthorizedAdminProfile();

  if (currentProfile.role !== "super_admin") {
    throw new Error("Only Super Admin accounts can manage registration policy.");
  }

  const { error } = await supabase.from("registration_settings").upsert({
    id: true,
    restrict_signup_to_allowed_domains: restrictSignupToAllowedDomains
  }, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createAllowedEmailDomain(domain: string, notes?: string | null) {
  const supabase = await requireAuthorizedAdminClient();
  const currentProfile = await requireAuthorizedAdminProfile();
  const normalizedDomain = parseEmailDomain(domain);
  const trimmedNotes = notes?.trim() || null;

  if (currentProfile.role !== "super_admin") {
    throw new Error("Only Super Admin accounts can manage registration policy.");
  }

  const { error } = await supabase.from("university_email_domains").insert({
    domain: normalizedDomain,
    is_allowed: true,
    notes: trimmedNotes
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAllowedEmailDomain(domainRuleId: string, updates: Partial<Pick<EmailDomainRule, "domain" | "is_allowed" | "notes">>) {
  const supabase = await requireAuthorizedAdminClient();
  const currentProfile = await requireAuthorizedAdminProfile();
  const allowedUpdates: Partial<Pick<EmailDomainRule, "domain" | "is_allowed" | "notes">> = {};

  if (currentProfile.role !== "super_admin") {
    throw new Error("Only Super Admin accounts can manage registration policy.");
  }

  if (updates.domain !== undefined) {
    allowedUpdates.domain = parseEmailDomain(updates.domain);
  }

  if (updates.is_allowed !== undefined) {
    allowedUpdates.is_allowed = updates.is_allowed;
  }

  if (updates.notes !== undefined) {
    allowedUpdates.notes = updates.notes?.trim() || null;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    throw new Error("At least one email domain update is required.");
  }

  const { error } = await supabase.from("university_email_domains").update(allowedUpdates).eq("id", domainRuleId);

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

async function readDashboardQuery<T>(
  operation: string,
  query: PromiseLike<SupabaseReadResult<T>>,
  fallback: T
): Promise<T> {
  try {
    const { data, error } = await query;

    if (error) {
      logDashboardReadFailure(operation, error);
      return fallback;
    }

    return data ?? fallback;
  } catch (error) {
    logDashboardReadFailure(operation, error);
    return fallback;
  }
}

async function readDashboardValue<T>(
  operation: string,
  load: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    logDashboardReadFailure(operation, error);
    return fallback;
  }
}

async function readDashboardCount(operation: string, query: PromiseLike<SupabaseCountResult>) {
  try {
    const { count, error } = await query;

    if (error) {
      logDashboardReadFailure(operation, error);
      return null;
    }

    return count;
  } catch (error) {
    logDashboardReadFailure(operation, error);
    return null;
  }
}

function logDashboardReadFailure(operation: string, error: unknown) {
  console.error("[LABTRACK admin] Supabase dashboard read failed", {
    operation,
    message: getErrorMessage(error)
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown Supabase read error.";
}

function toRegistrationPolicy(settingsRow: RegistrationSettingsRow | null, allowedDomains: EmailDomainRule[]): RegistrationPolicy {
  return {
    restrictSignupToAllowedDomains: settingsRow?.restrict_signup_to_allowed_domains ?? true,
    allowedDomains
  };
}

function parseEmailDomain(domain: string) {
  const normalizedDomain = normalizeEmailDomain(domain);

  if (!normalizedDomain || normalizedDomain.includes("@") || /\s/.test(normalizedDomain)) {
    throw new Error("Email domain is invalid.");
  }

  return normalizedDomain;
}

function normalizeStatuses(statuses: BorrowingMonitorFilters["statuses"]): BookingStatus[] | null {
  return statuses?.length ? statuses : null;
}

function validateAssetImageFile(file: File | null) {
  if (!file) {
    return null;
  }

  if (!ASSET_IMAGE_CONTENT_TYPES.has(file.type)) {
    return {
      path: ["imageFile"],
      message: "Upload a JPEG, PNG, or WebP image."
    };
  }

  if (file.size > ASSET_IMAGE_MAX_BYTES) {
    return {
      path: ["imageFile"],
      message: "Asset image must be 5 MB or smaller."
    };
  }

  return null;
}

async function uploadAssetPrimaryImage({
  altText,
  assetId,
  file,
  profileId,
  supabase
}: {
  altText: string;
  assetId: string;
  file: File;
  profileId: string;
  supabase: SupabaseServerClient;
}) {
  const storagePath = createAssetImageStoragePath(assetId, file);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(ASSET_IMAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const uploadedPath = uploadData.path || storagePath;
  const { error: imageError } = await supabase.from("asset_images").insert({
    asset_id: assetId,
    storage_path: uploadedPath,
    alt_text: altText,
    is_primary: true,
    uploaded_by: profileId
  });

  if (imageError) {
    await supabase.storage.from(ASSET_IMAGE_BUCKET).remove([uploadedPath]);
    throw new Error(imageError.message);
  }

  return uploadedPath;
}

async function cleanupFailedAssetCreate({
  assetId,
  assetWasInserted,
  imagePath,
  supabase
}: {
  assetId: string;
  assetWasInserted: boolean;
  imagePath: string | null;
  supabase: SupabaseServerClient;
}) {
  if (imagePath) {
    await supabase.storage.from(ASSET_IMAGE_BUCKET).remove([imagePath]);
  }

  if (assetWasInserted) {
    await supabase.from("assets").delete().eq("id", assetId);
  }
}

async function toAssetView(row: AdminAssetRowDto, supabase: SupabaseServerClient): Promise<AssetView> {
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
    primaryImageUrl: await createSignedAssetImageUrl(row.primary_image_url, supabase),
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

async function createSignedAssetImageUrl(storagePath: string | null, supabase: SupabaseServerClient) {
  if (!storagePath) {
    return null;
  }

  if (/^https?:\/\//i.test(storagePath)) {
    return storagePath;
  }

  const { data, error } = await supabase.storage
    .from(ASSET_IMAGE_BUCKET)
    .createSignedUrl(storagePath, ASSET_IMAGE_SIGNED_URL_TTL_SECONDS);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

function createAssetIdentifiers(assetId: string) {
  const compactId = assetId.replace(/-/g, "").toUpperCase();

  return {
    propertyNumber: `PSU-CCS-${new Date().getUTCFullYear()}-${compactId.slice(0, 8)}`,
    serialNumber: `LT-${compactId.slice(8, 20)}`
  };
}

function createAssetImageStoragePath(assetId: string, file: File) {
  const extension = ASSET_IMAGE_EXTENSIONS[file.type] ?? "bin";

  return `${assetId}/primary-${Date.now()}.${extension}`;
}

function createAssetQrCode(propertyNumber: string) {
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  const suffix = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const normalizedProperty = propertyNumber.replace(/[^A-Z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase();

  return `ASSET-${normalizedProperty}-${suffix}`;
}

function isMissingSessionError(error: { code?: string; message?: string; name?: string }) {
  return error.name === "AuthSessionMissingError"
    || error.code === "session_not_found"
    || error.message?.toLowerCase().includes("auth session missing") === true;
}
