"use client";

import {
  assetConditions,
  assetSchema,
  assetStatuses,
  buildQuickLoginAccounts,
  createQrPayload,
  type AssetCondition,
  type AssetStatus,
  type BookingStatus,
  type DefectStatus,
  type Profile,
  type QuickLoginAccount,
  type UserRole
} from "@labtrack/shared";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  LogIn,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Settings,
  Wrench
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseBrowserClient>>;

type AccessState =
  | { status: "checking" }
  | { status: "missing-config" }
  | { status: "signed-out" }
  | { status: "forbidden"; profile: Profile }
  | { status: "error"; message: string }
  | { status: "authorized"; profile: Profile };

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: Profile["role"];
  department: string | null;
  is_active: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
};

type LocationRow = {
  id: string;
  name: string;
};

type AssetRow = {
  id: string;
  property_number: string;
  serial_number: string | null;
  name: string;
  category_id: string;
  location_id: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string | null;
  created_at: string;
};

type ActiveQrRow = {
  id: string;
  asset_id: string;
  code: string;
  generated_at: string;
};

type BookingRow = {
  id: string;
  asset_id: string;
  instructor_id: string;
  purpose: string;
  status: BookingStatus;
  requested_start_at: string;
  requested_end_at: string;
  decision_notes: string | null;
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

type AssetView = {
  id: string;
  propertyNumber: string;
  serialNumber: string | null;
  name: string;
  categoryId: string;
  categoryName: string;
  locationId: string;
  locationName: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string | null;
  activeQr: ActiveQrRow | null;
};

type DashboardData = {
  categories: CategoryRow[];
  locations: LocationRow[];
  assets: AssetView[];
  bookings: BookingRow[];
  defects: DefectRow[];
  profiles: ProfileRow[];
  ticketThreads: TicketThreadRow[];
};

type AssetFormState = {
  propertyNumber: string;
  serialNumber: string;
  name: string;
  categoryId: string;
  locationId: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string;
};

type FormErrors = Partial<Record<keyof AssetFormState, string>>;

const blankAssetForm: AssetFormState = {
  propertyNumber: "",
  serialNumber: "",
  name: "",
  categoryId: "",
  locationId: "",
  condition: "good",
  status: "available",
  notes: ""
};

type AdminSection = "dashboard" | "assets" | "bookings" | "defects" | "tickets" | "access" | "catalog";

const navigation: Array<{ key: AdminSection; label: string; icon: typeof ClipboardCheck }> = [
  { key: "dashboard", label: "Dashboard", icon: ClipboardCheck },
  { key: "assets", label: "Assets & QR", icon: Package },
  { key: "bookings", label: "Bookings", icon: CheckCircle2 },
  { key: "defects", label: "Defects", icon: Wrench },
  { key: "tickets", label: "Tickets", icon: MessageSquare },
  { key: "access", label: "Access", icon: ShieldCheck },
  { key: "catalog", label: "Catalog", icon: Settings }
];

const webQuickLoginAccounts = buildQuickLoginAccounts({
  super_admin: {
    email: process.env.NEXT_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_EMAIL,
    password: process.env.NEXT_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_PASSWORD
  },
  admin: {
    email: process.env.NEXT_PUBLIC_QUICK_LOGIN_ADMIN_EMAIL,
    password: process.env.NEXT_PUBLIC_QUICK_LOGIN_ADMIN_PASSWORD
  },
  instructor: {
    email: process.env.NEXT_PUBLIC_QUICK_LOGIN_INSTRUCTOR_EMAIL,
    password: process.env.NEXT_PUBLIC_QUICK_LOGIN_INSTRUCTOR_PASSWORD
  }
}, { roles: ["super_admin", "admin"] });

export function AdminDashboard() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [access, setAccess] = useState<AccessState>({ status: "checking" });
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [quickLoginRole, setQuickLoginRole] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    categories: [],
    locations: [],
    assets: [],
    bookings: [],
    defects: [],
    profiles: [],
    ticketThreads: []
  });
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<TicketMessageRow[]>([]);
  const [ticketBody, setTicketBody] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [isWritingQr, setIsWritingQr] = useState(false);
  const [isMutatingWorkflow, setIsMutatingWorkflow] = useState(false);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [assetForm, setAssetForm] = useState<AssetFormState>(blankAssetForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [locationName, setLocationName] = useState("");

  const selectedAsset = useMemo(() => {
    if (!data.assets.length) {
      return null;
    }

    return data.assets.find((asset) => asset.id === selectedAssetId) ?? data.assets[0];
  }, [data.assets, selectedAssetId]);

  const authorizedProfile = access.status === "authorized" ? access.profile : null;

  const loadAccess = useCallback(async () => {
    if (!supabase) {
      setAccess({ status: "missing-config" });
      return;
    }

    setAccess({ status: "checking" });
    setAuthMessage(null);

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      setAccess({ status: "error", message: sessionError.message });
      return;
    }

    if (!session) {
      setAccess({ status: "signed-out" });
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,department,is_active")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      setAccess({ status: "error", message: profileError.message });
      return;
    }

    if (!profileData) {
      setAccess({ status: "error", message: "No LABTRACK profile exists for the signed-in user." });
      return;
    }

    const profile = toProfile(profileData as ProfileRow);

    if (!profile.isActive || (profile.role !== "admin" && profile.role !== "super_admin")) {
      setAccess({ status: "forbidden", profile });
      return;
    }

    setAccess({ status: "authorized", profile });
  }, [supabase]);

  const loadDashboardData = useCallback(async () => {
    if (!supabase) {
      return;
    }

    setIsLoadingData(true);
    setDashboardMessage(null);

    const [
      categoriesResult,
      locationsResult,
      assetsResult,
      qrResult,
      bookingsResult,
      defectsResult,
      profilesResult,
      threadsResult
    ] = await Promise.all([
      supabase.from("asset_categories").select("id,name").order("name"),
      supabase.from("locations").select("id,name").order("name"),
      supabase
        .from("assets")
        .select("id,property_number,serial_number,name,category_id,location_id,condition,status,notes,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("asset_qr_codes")
        .select("id,asset_id,code,generated_at")
        .eq("is_active", true)
        .order("generated_at", { ascending: false }),
      supabase
        .from("bookings")
        .select("id,asset_id,instructor_id,purpose,status,requested_start_at,requested_end_at,decision_notes")
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
        .limit(50)
    ]);

    const error = [
      categoriesResult.error,
      locationsResult.error,
      assetsResult.error,
      qrResult.error,
      bookingsResult.error,
      defectsResult.error,
      profilesResult.error,
      threadsResult.error
    ].find(Boolean);

    if (error) {
      setDashboardMessage(error.message);
      setIsLoadingData(false);
      return;
    }

    const categories = (categoriesResult.data ?? []) as CategoryRow[];
    const locations = (locationsResult.data ?? []) as LocationRow[];
    const qrCodes = (qrResult.data ?? []) as ActiveQrRow[];
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    const locationNames = new Map(locations.map((location) => [location.id, location.name]));
    const qrByAssetId = new Map(qrCodes.map((qrCode) => [qrCode.asset_id, qrCode]));
    const assets = ((assetsResult.data ?? []) as AssetRow[]).map((asset) => ({
      id: asset.id,
      propertyNumber: asset.property_number,
      serialNumber: asset.serial_number,
      name: asset.name,
      categoryId: asset.category_id,
      categoryName: categoryNames.get(asset.category_id) ?? "Uncategorized",
      locationId: asset.location_id,
      locationName: locationNames.get(asset.location_id) ?? "Unassigned",
      condition: asset.condition,
      status: asset.status,
      notes: asset.notes,
      activeQr: qrByAssetId.get(asset.id) ?? null
    }));

    setData({
      categories,
      locations,
      assets,
      bookings: (bookingsResult.data ?? []) as BookingRow[],
      defects: (defectsResult.data ?? []) as DefectRow[],
      profiles: (profilesResult.data ?? []) as ProfileRow[],
      ticketThreads: (threadsResult.data ?? []) as TicketThreadRow[]
    });
    setSelectedAssetId((current) => {
      if (current && assets.some((asset) => asset.id === current)) {
        return current;
      }

      return assets[0]?.id ?? null;
    });
    setIsLoadingData(false);
  }, [supabase]);

  const loadThreadMessages = useCallback(async (threadId: string | null) => {
    if (!supabase || !threadId) {
      setThreadMessages([]);
      return;
    }

    const { data: messages, error } = await supabase
      .from("ticket_messages")
      .select("id,thread_id,sender_id,body,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      setDashboardMessage(error.message);
      return;
    }

    setThreadMessages((messages ?? []) as TicketMessageRow[]);
  }, [supabase]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  useEffect(() => {
    if (access.status === "authorized") {
      void loadDashboardData();
    }
  }, [access.status, loadDashboardData]);

  useEffect(() => {
    void loadThreadMessages(selectedThreadId);
  }, [loadThreadMessages, selectedThreadId]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setAuthMessage(null);
    const { error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    await loadAccess();
  }

  async function handleQuickSignIn(account: QuickLoginAccount) {
    if (!supabase) {
      return;
    }

    setQuickLoginRole(account.role);
    setCredentials({ email: account.email, password: account.password });
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password
    });

    if (error) {
      setAuthMessage(error.message);
      setQuickLoginRole(null);
      return;
    }

    await loadAccess();
    setQuickLoginRole(null);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setData({ categories: [], locations: [], assets: [], bookings: [], defects: [], profiles: [], ticketThreads: [] });
    setSelectedAssetId(null);
    setSelectedThreadId(null);
    setThreadMessages([]);
    setAccess({ status: "signed-out" });
  }

  async function handleCreateAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !authorizedProfile) {
      return;
    }

    const normalized = {
      propertyNumber: assetForm.propertyNumber.trim(),
      serialNumber: assetForm.serialNumber.trim() || null,
      name: assetForm.name.trim(),
      categoryId: assetForm.categoryId,
      locationId: assetForm.locationId,
      condition: assetForm.condition,
      status: assetForm.status
    };
    const validation = assetSchema.safeParse(normalized);

    if (!validation.success) {
      setFormErrors(toFormErrors(validation.error.issues));
      return;
    }

    setIsSavingAsset(true);
    setFormErrors({});
    setDashboardMessage(null);

    const { data: insertedAsset, error } = await supabase
      .from("assets")
      .insert({
        property_number: validation.data.propertyNumber,
        serial_number: validation.data.serialNumber ?? null,
        name: validation.data.name,
        category_id: validation.data.categoryId,
        location_id: validation.data.locationId,
        condition: validation.data.condition,
        status: validation.data.status,
        notes: assetForm.notes.trim() || null,
        created_by: authorizedProfile.id
      })
      .select("id")
      .single();

    if (error) {
      setDashboardMessage(error.message);
      setIsSavingAsset(false);
      return;
    }

    setAssetForm(blankAssetForm);
    setIsAssetFormOpen(false);
    await loadDashboardData();
    setSelectedAssetId((insertedAsset as { id: string } | null)?.id ?? null);
    setDashboardMessage("Asset created.");
    setIsSavingAsset(false);
  }

  async function handleGenerateQr(asset: AssetView | null) {
    if (!supabase || !authorizedProfile || !asset) {
      return;
    }

    if (asset.activeQr) {
      setDashboardMessage("This asset already has an active QR code.");
      return;
    }

    await writeNewQrCode(supabase, authorizedProfile, asset);
  }

  async function handleRegenerateQr(asset: AssetView | null) {
    if (!supabase || !authorizedProfile || !asset) {
      return;
    }

    if (!asset.activeQr) {
      await writeNewQrCode(supabase, authorizedProfile, asset);
      return;
    }

    setIsWritingQr(true);
    setDashboardMessage(null);

    const { error } = await supabase.rpc("regenerate_asset_qr", {
      p_asset_id: asset.id,
      p_qr_code: createAssetQrCode(asset)
    });

    if (error) {
      setDashboardMessage(`${error.message} Refreshing asset data.`);
      await loadDashboardData();
      setIsWritingQr(false);
      return;
    }

    await loadDashboardData();
    setSelectedAssetId(asset.id);
    setDashboardMessage("QR code regenerated.");
    setIsWritingQr(false);
  }

  async function writeNewQrCode(supabaseClient: SupabaseClient, profile: Profile, asset: AssetView) {
    setIsWritingQr(true);
    setDashboardMessage(null);

    const { error } = await supabaseClient.from("asset_qr_codes").insert({
      asset_id: asset.id,
      code: createAssetQrCode(asset),
      generated_by: profile.id
    });

    if (error) {
      setDashboardMessage(`${error.message} Refreshing asset data.`);
      await loadDashboardData();
      setIsWritingQr(false);
      return;
    }

    await loadDashboardData();
    setSelectedAssetId(asset.id);
    setDashboardMessage("QR code updated.");
    setIsWritingQr(false);
  }

  async function runWorkflowMutation(action: () => PromiseLike<{ error: { message: string } | null }>, successMessage: string) {
    setIsMutatingWorkflow(true);
    setDashboardMessage(null);

    const { error } = await action();

    if (error) {
      setDashboardMessage(error.message);
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    if (selectedThreadId) {
      await loadThreadMessages(selectedThreadId);
    }
    setDashboardMessage(successMessage);
    setIsMutatingWorkflow(false);
  }

  async function handleBookingDecision(booking: BookingRow, status: "approved" | "rejected") {
    if (!supabase) {
      return;
    }

    await runWorkflowMutation(
      () => supabase.rpc("decide_booking", {
        p_booking_id: booking.id,
        p_status: status,
        p_notes: status === "approved" ? "Approved from LABTRACK admin." : "Rejected from LABTRACK admin."
      }),
      `Booking ${status}.`
    );
  }

  async function handleBookingCheckout(booking: BookingRow) {
    if (!supabase) {
      return;
    }

    await runWorkflowMutation(
      () => supabase.rpc("checkout_booking", { p_booking_id: booking.id, p_notes: "Checked out from LABTRACK admin." }),
      "Booking checked out."
    );
  }

  async function handleBookingReturn(booking: BookingRow) {
    if (!supabase) {
      return;
    }

    await runWorkflowMutation(
      () => supabase.rpc("return_booking", { p_booking_id: booking.id, p_notes: "Returned from LABTRACK admin." }),
      "Booking returned."
    );
  }

  async function handleBookingCancel(booking: BookingRow) {
    if (!supabase) {
      return;
    }

    await runWorkflowMutation(
      () => supabase.rpc("cancel_booking", { p_booking_id: booking.id }),
      "Booking cancelled."
    );
  }

  async function handleDefectTriage(report: DefectRow, status: "under_review" | "sent_for_repair" | "resolved" | "rejected") {
    if (!supabase) {
      return;
    }

    await runWorkflowMutation(
      () => supabase.rpc("triage_defect_report", {
        p_defect_report_id: report.id,
        p_status: status,
        p_notes: `Marked ${formatLabel(status)} from LABTRACK admin.`
      }),
      `Defect marked ${formatLabel(status)}.`
    );
  }

  async function handleSendTicketMessage() {
    if (!supabase || !selectedThreadId || !ticketBody.trim()) {
      return;
    }

    setIsMutatingWorkflow(true);
    setDashboardMessage(null);

    const { error } = await supabase.rpc("send_ticket_message", {
      p_thread_id: selectedThreadId,
      p_body: ticketBody.trim()
    });

    if (error) {
      setDashboardMessage(error.message);
      setIsMutatingWorkflow(false);
      return;
    }

    setTicketBody("");
    await loadThreadMessages(selectedThreadId);
    setDashboardMessage("Message sent.");
    setIsMutatingWorkflow(false);
  }

  async function handleProfileUpdate(profile: ProfileRow, updates: Partial<Pick<ProfileRow, "role" | "is_active">>) {
    if (!supabase || authorizedProfile?.role !== "super_admin") {
      return;
    }

    if (profile.id === authorizedProfile.id && (updates.is_active === false || (updates.role && updates.role !== "super_admin"))) {
      setDashboardMessage("You cannot remove your own active super admin access.");
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);

    if (error) {
      setDashboardMessage(error.message);
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    setDashboardMessage("Profile updated.");
    setIsMutatingWorkflow(false);
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !categoryName.trim()) {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await supabase.from("asset_categories").insert({ name: categoryName.trim() });

    if (error) {
      setDashboardMessage(error.message);
      setIsMutatingWorkflow(false);
      return;
    }

    setCategoryName("");
    await loadDashboardData();
    setDashboardMessage("Category created.");
    setIsMutatingWorkflow(false);
  }

  async function handleCreateLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !locationName.trim()) {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await supabase.from("locations").insert({ name: locationName.trim() });

    if (error) {
      setDashboardMessage(error.message);
      setIsMutatingWorkflow(false);
      return;
    }

    setLocationName("");
    await loadDashboardData();
    setDashboardMessage("Location created.");
    setIsMutatingWorkflow(false);
  }

  if (access.status !== "authorized") {
    return (
      <AccessShell
        access={access}
        authMessage={authMessage}
        credentials={credentials}
        quickLoginAccounts={webQuickLoginAccounts}
        quickLoginRole={quickLoginRole}
        onCredentialsChange={setCredentials}
        onQuickSignIn={handleQuickSignIn}
        onRetry={loadAccess}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>LABTRACK</strong>
          <span>CCS Asset Operations</span>
        </div>
        <nav className="nav" aria-label="Admin sections">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button className={activeSection === item.key ? "active" : ""} key={item.label} onClick={() => setActiveSection(item.key)} type="button">
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="content">
        <div className="topbar">
          <div>
            <p className="eyebrow">Pampanga State University</p>
            <h1>Hardware asset command center</h1>
            <p className="muted">Manage QR-tagged equipment, instructor bookings, defect reports, and ticket communication.</p>
          </div>
          <div className="actions">
            <button className="button secondary" disabled={isLoadingData} onClick={loadDashboardData} type="button">
              <RefreshCw size={16} />
              {isLoadingData ? "Syncing" : "Sync Supabase"}
            </button>
            <button className="button primary" disabled={isWritingQr || !selectedAsset || Boolean(selectedAsset.activeQr)} onClick={() => handleGenerateQr(selectedAsset)} type="button">
              <QrCode size={16} />
              Generate QR
            </button>
            <button className="button secondary" onClick={handleSignOut} type="button">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>

        <div className="profile-strip">
          <span>{access.profile.fullName}</span>
          <StatusBadge status={access.profile.role} />
        </div>

        {dashboardMessage ? <Notice tone={dashboardMessage.includes("created") || dashboardMessage.includes("updated") ? "success" : "warning"}>{dashboardMessage}</Notice> : null}

        <section className="metrics" aria-label="Operational summary">
          <Metric label="Registered assets" value={data.assets.length.toString()} />
          <Metric label="Pending bookings" value={data.bookings.filter((booking) => booking.status === "pending").length.toString()} />
          <Metric label="Defect reports" value={data.defects.length.toString()} />
          <Metric label="Active QR codes" value={data.assets.filter((asset) => asset.activeQr).length.toString()} />
        </section>

        {activeSection === "dashboard" ? (
          <section className="grid" style={{ marginTop: 18 }}>
            <WorkflowPanel title="Booking queue" items={data.bookings.slice(0, 8).map((booking) => ({
              id: booking.id,
              title: data.assets.find((asset) => asset.id === booking.asset_id)?.name ?? "Unknown asset",
              detail: booking.purpose,
              status: booking.status
            }))} />
            <WorkflowPanel title="Defect triage" items={data.defects.slice(0, 8).map((report) => ({
              id: report.id,
              title: report.title,
              detail: report.description,
              status: report.status
            }))} />
          </section>
        ) : null}

        {activeSection === "assets" ? (
        <section className="grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Asset register</h2>
                <p className="muted">Every physical item receives its own QR code and operational history.</p>
              </div>
              <button className="button secondary" onClick={() => setIsAssetFormOpen((value) => !value)} type="button">
                <Plus size={15} />
                New asset
              </button>
            </div>
            {isAssetFormOpen ? (
              <AssetForm
                categories={data.categories}
                errors={formErrors}
                form={assetForm}
                isSaving={isSavingAsset}
                locations={data.locations}
                onChange={(nextForm) => {
                  setAssetForm(nextForm);
                  setFormErrors({});
                }}
                onSubmit={handleCreateAsset}
              />
            ) : null}
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Property no.</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>QR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((asset) => (
                    <tr className={asset.id === selectedAsset?.id ? "selected-row" : ""} key={asset.id}>
                      <td>
                        <strong>{asset.name}</strong>
                        <p className="muted">{asset.categoryName}</p>
                      </td>
                      <td>{asset.propertyNumber}</td>
                      <td>{asset.locationName}</td>
                      <td><StatusBadge status={asset.status} /></td>
                      <td>
                        <button className="button secondary" onClick={() => setSelectedAssetId(asset.id)} type="button">
                          <ScanLine size={15} />
                          Preview
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.assets.length && !isLoadingData ? <EmptyState label="No assets found." /> : null}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>QR code label</h2>
                <p className="muted">Admin-generated code for instructor scanning.</p>
              </div>
            </div>
            <div className="panel-body qr-card">
              <QrPreview asset={selectedAsset} />
              <div className="actions">
                <button className="button primary" disabled={!selectedAsset?.activeQr} onClick={() => downloadQrLabel(selectedAsset)} type="button">
                  <Download size={15} />
                  Download PNG
                </button>
                <button className="button secondary" disabled={isWritingQr || !selectedAsset} onClick={() => handleRegenerateQr(selectedAsset)} type="button">
                  <RefreshCw size={15} />
                  {selectedAsset?.activeQr ? "Regenerate" : "Generate"}
                </button>
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {activeSection === "bookings" ? (
          <BookingAdminPanel
            assets={data.assets}
            bookings={data.bookings}
            disabled={isMutatingWorkflow}
            onApprove={(booking) => void handleBookingDecision(booking, "approved")}
            onCancel={(booking) => void handleBookingCancel(booking)}
            onCheckout={(booking) => void handleBookingCheckout(booking)}
            onReject={(booking) => void handleBookingDecision(booking, "rejected")}
            onReturn={(booking) => void handleBookingReturn(booking)}
            profiles={data.profiles}
          />
        ) : null}

        {activeSection === "defects" ? (
          <DefectAdminPanel
            assets={data.assets}
            disabled={isMutatingWorkflow}
            onTriage={(report, status) => void handleDefectTriage(report, status)}
            profiles={data.profiles}
            reports={data.defects}
          />
        ) : null}

        {activeSection === "tickets" ? (
          <TicketAdminPanel
            disabled={isMutatingWorkflow}
            messages={threadMessages}
            onBodyChange={setTicketBody}
            onRefresh={() => void loadThreadMessages(selectedThreadId)}
            onSelectThread={(threadId) => setSelectedThreadId(threadId)}
            onSend={() => void handleSendTicketMessage()}
            selectedThreadId={selectedThreadId}
            ticketBody={ticketBody}
            threads={data.ticketThreads}
          />
        ) : null}

        {activeSection === "access" ? (
          <AccessManagementPanel
            currentProfile={access.profile}
            disabled={isMutatingWorkflow}
            onUpdate={handleProfileUpdate}
            profiles={data.profiles}
          />
        ) : null}

        {activeSection === "catalog" ? (
          <CatalogPanel
            categories={data.categories}
            categoryName={categoryName}
            disabled={isMutatingWorkflow}
            locationName={locationName}
            locations={data.locations}
            onCategoryNameChange={setCategoryName}
            onCreateCategory={handleCreateCategory}
            onCreateLocation={handleCreateLocation}
            onLocationNameChange={setLocationName}
          />
        ) : null}
      </section>
    </main>
  );
}

function AccessShell({
  access,
  authMessage,
  credentials,
  quickLoginAccounts,
  quickLoginRole,
  onCredentialsChange,
  onQuickSignIn,
  onRetry,
  onSignIn,
  onSignOut
}: {
  access: AccessState;
  authMessage: string | null;
  credentials: { email: string; password: string };
  quickLoginAccounts: QuickLoginAccount[];
  quickLoginRole: string | null;
  onCredentialsChange: (credentials: { email: string; password: string }) => void;
  onQuickSignIn: (account: QuickLoginAccount) => void;
  onRetry: () => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
}) {
  return (
    <main className="access-shell">
      <section className="access-panel">
        <div className="brand">
          <strong>LABTRACK</strong>
          <span>CCS Asset Operations</span>
        </div>

        {access.status === "checking" ? (
          <Notice tone="neutral">Checking admin access.</Notice>
        ) : null}

        {access.status === "missing-config" ? (
          <Notice tone="warning">
            Supabase public configuration is missing. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
          </Notice>
        ) : null}

        {access.status === "error" ? (
          <>
            <Notice tone="danger">{access.message}</Notice>
            <button className="button secondary" onClick={onRetry} type="button">Retry</button>
          </>
        ) : null}

        {access.status === "forbidden" ? (
          <>
            <Notice tone="danger">
              {access.profile.fullName} does not have active admin access.
            </Notice>
            <button className="button secondary" onClick={onSignOut} type="button">
              <LogOut size={16} />
              Switch account
            </button>
          </>
        ) : null}

        {access.status === "signed-out" ? (
          <form className="form-grid" onSubmit={onSignIn}>
            <div>
              <h1>Admin sign in</h1>
              <p className="muted">Use an active admin or super admin account.</p>
            </div>
            {authMessage ? <Notice tone="danger">{authMessage}</Notice> : null}
            {quickLoginAccounts.length ? (
              <div className="quick-login-grid">
                {quickLoginAccounts.map((account) => (
                  <button
                    className="button secondary"
                    disabled={quickLoginRole !== null}
                    key={account.role}
                    onClick={() => onQuickSignIn(account)}
                    type="button"
                  >
                    <LogIn size={16} />
                    {quickLoginRole === account.role ? "Signing in" : account.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                autoComplete="email"
                id="email"
                onChange={(event) => onCredentialsChange({ ...credentials, email: event.target.value })}
                required
                type="email"
                value={credentials.email}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                autoComplete="current-password"
                id="password"
                onChange={(event) => onCredentialsChange({ ...credentials, password: event.target.value })}
                required
                type="password"
                value={credentials.password}
              />
            </div>
            <button className="button primary" type="submit">
              <LogIn size={16} />
              Sign in
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

function AssetForm({
  categories,
  errors,
  form,
  isSaving,
  locations,
  onChange,
  onSubmit
}: {
  categories: CategoryRow[];
  errors: FormErrors;
  form: AssetFormState;
  isSaving: boolean;
  locations: LocationRow[];
  onChange: (form: AssetFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="asset-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="asset-name">Asset name</label>
        <input id="asset-name" onChange={(event) => onChange({ ...form, name: event.target.value })} value={form.name} />
        {errors.name ? <span className="field-error">{errors.name}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="property-number">Property number</label>
        <input id="property-number" onChange={(event) => onChange({ ...form, propertyNumber: event.target.value })} value={form.propertyNumber} />
        {errors.propertyNumber ? <span className="field-error">{errors.propertyNumber}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="serial-number">Serial number</label>
        <input id="serial-number" onChange={(event) => onChange({ ...form, serialNumber: event.target.value })} value={form.serialNumber} />
        {errors.serialNumber ? <span className="field-error">{errors.serialNumber}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="category">Category</label>
        <select id="category" onChange={(event) => onChange({ ...form, categoryId: event.target.value })} required value={form.categoryId}>
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        {errors.categoryId ? <span className="field-error">{errors.categoryId}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="location">Location</label>
        <select id="location" onChange={(event) => onChange({ ...form, locationId: event.target.value })} required value={form.locationId}>
          <option value="">Select location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
        {errors.locationId ? <span className="field-error">{errors.locationId}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="condition">Condition</label>
        <select id="condition" onChange={(event) => onChange({ ...form, condition: event.target.value as AssetCondition })} value={form.condition}>
          {assetConditions.map((condition) => (
            <option key={condition} value={condition}>{formatLabel(condition)}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" onChange={(event) => onChange({ ...form, status: event.target.value as AssetStatus })} value={form.status}>
          {assetStatuses.map((status) => (
            <option key={status} value={status}>{formatLabel(status)}</option>
          ))}
        </select>
      </div>
      <div className="field span-2">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" onChange={(event) => onChange({ ...form, notes: event.target.value })} rows={3} value={form.notes} />
      </div>
      <div className="form-actions">
        <button className="button primary" disabled={isSaving} type="submit">
          <Plus size={15} />
          {isSaving ? "Saving" : "Create asset"}
        </button>
      </div>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{formatLabel(status)}</span>;
}

function QrPreview({ asset }: { asset: AssetView | null }) {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const activeCode = asset?.activeQr?.code ?? "";
  const payload = activeCode ? createQrPayload(activeCode) : "";
  const instructorDeepLink = payload ? `labtrack://asset/${encodeURIComponent(payload)}` : "";

  return (
    <>
      <div className="qr-frame" ref={qrContainerRef}>
        {payload ? <QRCodeSVG value={payload} size={190} level="M" includeMargin /> : <EmptyState label="No active QR code." />}
      </div>
      <div className="form-grid">
        <div>
          <h3>{asset?.name ?? "Select an asset"}</h3>
          <p className="muted">{asset?.propertyNumber ?? "No asset selected"}</p>
        </div>
        <div className="field">
          <label>QR payload</label>
          <input readOnly value={payload} />
        </div>
        <div className="field">
          <label>Instructor deep link</label>
          <input readOnly value={instructorDeepLink} />
        </div>
      </div>
    </>
  );
}

function WorkflowPanel({ title, items }: { title: string; items: Array<{ id: string; title: string; detail: string; status: string }> }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <div className="panel-body timeline">
        {items.length ? items.map((item) => (
          <article className="timeline-item" key={item.id}>
            <div className="topbar compact">
              <h3>{item.title}</h3>
              <StatusBadge status={item.status} />
            </div>
            <p className="muted">{item.detail}</p>
          </article>
        )) : <EmptyState label="No records found." />}
      </div>
    </div>
  );
}

function BookingAdminPanel({
  assets,
  bookings,
  disabled,
  onApprove,
  onCancel,
  onCheckout,
  onReject,
  onReturn,
  profiles
}: {
  assets: AssetView[];
  bookings: BookingRow[];
  disabled: boolean;
  onApprove: (booking: BookingRow) => void;
  onCancel: (booking: BookingRow) => void;
  onCheckout: (booking: BookingRow) => void;
  onReject: (booking: BookingRow) => void;
  onReturn: (booking: BookingRow) => void;
  profiles: ProfileRow[];
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Booking queue</h2>
          <p className="muted">Approve, reject, check out, return, or cancel instructor requests.</p>
        </div>
      </div>
      <div className="panel-body timeline">
        {bookings.length ? bookings.map((booking) => {
          const asset = assets.find((item) => item.id === booking.asset_id);
          const instructor = profiles.find((profile) => profile.id === booking.instructor_id);
          return (
            <article className="timeline-item" key={booking.id}>
              <div className="topbar compact">
                <div>
                  <h3>{asset?.name ?? "Unknown asset"}</h3>
                  <p className="muted">{instructor?.full_name ?? "Unknown instructor"}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <p className="muted">{booking.purpose}</p>
              <p className="muted">{formatDateTime(booking.requested_start_at)} - {formatDateTime(booking.requested_end_at)}</p>
              {booking.decision_notes ? <p className="muted">{booking.decision_notes}</p> : null}
              <div className="actions">
                {booking.status === "pending" ? (
                  <>
                    <button className="button primary" disabled={disabled} onClick={() => onApprove(booking)} type="button">Approve</button>
                    <button className="button secondary" disabled={disabled} onClick={() => onReject(booking)} type="button">Reject</button>
                    <button className="button secondary" disabled={disabled} onClick={() => onCancel(booking)} type="button">Cancel</button>
                  </>
                ) : null}
                {booking.status === "approved" ? (
                  <>
                    <button className="button primary" disabled={disabled} onClick={() => onCheckout(booking)} type="button">Check out</button>
                    <button className="button secondary" disabled={disabled} onClick={() => onCancel(booking)} type="button">Cancel</button>
                  </>
                ) : null}
                {booking.status === "checked_out" ? (
                  <button className="button primary" disabled={disabled} onClick={() => onReturn(booking)} type="button">Return</button>
                ) : null}
              </div>
            </article>
          );
        }) : <EmptyState label="No bookings found." />}
      </div>
    </div>
  );
}

function DefectAdminPanel({
  assets,
  disabled,
  onTriage,
  profiles,
  reports
}: {
  assets: AssetView[];
  disabled: boolean;
  onTriage: (report: DefectRow, status: "under_review" | "sent_for_repair" | "resolved" | "rejected") => void;
  profiles: ProfileRow[];
  reports: DefectRow[];
}) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Defect triage</h2>
          <p className="muted">Review reports and update asset repair status.</p>
        </div>
      </div>
      <div className="panel-body timeline">
        {reports.length ? reports.map((report) => {
          const asset = assets.find((item) => item.id === report.asset_id);
          const instructor = profiles.find((profile) => profile.id === report.instructor_id);
          const canTriage = !["resolved", "rejected"].includes(report.status);
          return (
            <article className="timeline-item" key={report.id}>
              <div className="topbar compact">
                <div>
                  <h3>{report.title}</h3>
                  <p className="muted">{asset?.name ?? "Unknown asset"} · {instructor?.full_name ?? "Unknown instructor"}</p>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <p className="muted">{report.description}</p>
              {report.resolution_notes ? <p className="muted">{report.resolution_notes}</p> : null}
              {canTriage ? (
                <div className="actions">
                  {report.status === "pending" ? <button className="button secondary" disabled={disabled} onClick={() => onTriage(report, "under_review")} type="button">Review</button> : null}
                  <button className="button secondary" disabled={disabled} onClick={() => onTriage(report, "sent_for_repair")} type="button">Send for repair</button>
                  <button className="button primary" disabled={disabled} onClick={() => onTriage(report, "resolved")} type="button">Resolve</button>
                  <button className="button secondary" disabled={disabled} onClick={() => onTriage(report, "rejected")} type="button">Reject</button>
                </div>
              ) : null}
            </article>
          );
        }) : <EmptyState label="No defect reports found." />}
      </div>
    </div>
  );
}

function TicketAdminPanel({
  disabled,
  messages,
  onBodyChange,
  onRefresh,
  onSelectThread,
  onSend,
  selectedThreadId,
  ticketBody,
  threads
}: {
  disabled: boolean;
  messages: TicketMessageRow[];
  onBodyChange: (body: string) => void;
  onRefresh: () => void;
  onSelectThread: (threadId: string) => void;
  onSend: () => void;
  selectedThreadId: string | null;
  ticketBody: string;
  threads: TicketThreadRow[];
}) {
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;

  return (
    <section className="grid">
      <div className="panel">
        <div className="panel-header">
          <h2>Ticket threads</h2>
        </div>
        <div className="panel-body timeline">
          {threads.length ? threads.map((thread) => (
            <article className="timeline-item" key={thread.id}>
              <div className="topbar compact">
                <h3>{formatLabel(thread.subject_type)}</h3>
                <button className="button secondary" onClick={() => onSelectThread(thread.id)} type="button">Open</button>
              </div>
              <p className="muted">{thread.booking_id ? `Booking ${thread.booking_id}` : `Defect ${thread.defect_report_id}`}</p>
              <p className="muted">{formatDateTime(thread.created_at)}</p>
            </article>
          )) : <EmptyState label="No ticket threads found." />}
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Conversation</h2>
            <p className="muted">{selectedThread ? `Thread ${selectedThread.id}` : "Select a thread."}</p>
          </div>
          <button className="button secondary" disabled={!selectedThread} onClick={onRefresh} type="button">Refresh</button>
        </div>
        <div className="panel-body timeline">
          {messages.length ? messages.map((message) => (
            <article className="timeline-item" key={message.id}>
              <p className="muted">{formatDateTime(message.created_at)}</p>
              <p>{message.body}</p>
            </article>
          )) : <EmptyState label={selectedThread ? "No messages yet." : "No thread selected."} />}
          {selectedThread ? (
            <div className="field">
              <label htmlFor="ticket-message">Reply</label>
              <textarea id="ticket-message" onChange={(event) => onBodyChange(event.target.value)} rows={4} value={ticketBody} />
              <button className="button primary" disabled={disabled || !ticketBody.trim()} onClick={onSend} type="button">Send message</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AccessManagementPanel({
  currentProfile,
  disabled,
  onUpdate,
  profiles
}: {
  currentProfile: Profile;
  disabled: boolean;
  onUpdate: (profile: ProfileRow, updates: Partial<Pick<ProfileRow, "role" | "is_active">>) => void;
  profiles: ProfileRow[];
}) {
  if (currentProfile.role !== "super_admin") {
    return (
      <div className="panel">
        <div className="panel-body">
          <Notice tone="warning">Only super admins can manage account access.</Notice>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Access management</h2>
          <p className="muted">Promote admins and deactivate accounts.</p>
        </div>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td>{profile.full_name}</td>
                <td>{profile.email}</td>
                <td>
                  <select disabled={disabled} onChange={(event) => onUpdate(profile, { role: event.target.value as UserRole })} value={profile.role}>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                </td>
                <td>
                  <button className="button secondary" disabled={disabled} onClick={() => onUpdate(profile, { is_active: !profile.is_active })} type="button">
                    {profile.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogPanel({
  categories,
  categoryName,
  disabled,
  locationName,
  locations,
  onCategoryNameChange,
  onCreateCategory,
  onCreateLocation,
  onLocationNameChange
}: {
  categories: CategoryRow[];
  categoryName: string;
  disabled: boolean;
  locationName: string;
  locations: LocationRow[];
  onCategoryNameChange: (value: string) => void;
  onCreateCategory: (event: FormEvent<HTMLFormElement>) => void;
  onCreateLocation: (event: FormEvent<HTMLFormElement>) => void;
  onLocationNameChange: (value: string) => void;
}) {
  return (
    <section className="grid">
      <div className="panel">
        <div className="panel-header">
          <h2>Asset categories</h2>
        </div>
        <form className="asset-form" onSubmit={onCreateCategory}>
          <div className="field">
            <label htmlFor="category-name">Category name</label>
            <input id="category-name" onChange={(event) => onCategoryNameChange(event.target.value)} value={categoryName} />
          </div>
          <div className="form-actions">
            <button className="button primary" disabled={disabled || !categoryName.trim()} type="submit">Create category</button>
          </div>
        </form>
        <div className="panel-body timeline">
          {categories.length ? categories.map((category) => (
            <article className="timeline-item" key={category.id}>
              <h3>{category.name}</h3>
            </article>
          )) : <EmptyState label="No categories found." />}
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <h2>Locations</h2>
        </div>
        <form className="asset-form" onSubmit={onCreateLocation}>
          <div className="field">
            <label htmlFor="location-name">Location name</label>
            <input id="location-name" onChange={(event) => onLocationNameChange(event.target.value)} value={locationName} />
          </div>
          <div className="form-actions">
            <button className="button primary" disabled={disabled || !locationName.trim()} type="submit">Create location</button>
          </div>
        </form>
        <div className="panel-body timeline">
          {locations.length ? locations.map((location) => (
            <article className="timeline-item" key={location.id}>
              <h3>{location.name}</h3>
            </article>
          )) : <EmptyState label="No locations found." />}
        </div>
      </div>
    </section>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "danger" | "neutral" | "success" | "warning" }) {
  return (
    <div className={`notice ${tone}`}>
      <AlertTriangle size={16} />
      <span>{children}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="empty-state">{label}</div>;
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

function toFormErrors(issues: Array<{ path: PropertyKey[]; message: string }>): FormErrors {
  return issues.reduce<FormErrors>((errors, issue) => {
    const key = issue.path[0];

    if (typeof key === "string" && key in blankAssetForm) {
      errors[key as keyof AssetFormState] = issue.message;
    }

    return errors;
  }, {});
}

function createAssetQrCode(asset: AssetView) {
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  const suffix = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  const normalizedProperty = asset.propertyNumber.replace(/[^A-Z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase();

  return `ASSET-${normalizedProperty}-${suffix}`;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

async function downloadQrLabel(asset: AssetView | null) {
  if (!asset?.activeQr) {
    return;
  }

  const payload = createQrPayload(asset.activeQr.code);
  const svg = document.querySelector(".qr-frame svg");

  if (!svg) {
    return;
  }

  const serializedSvg = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([serializedSvg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    const width = 720;
    const height = 860;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      URL.revokeObjectURL(svgUrl);
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#1C2930";
    context.lineWidth = 4;
    context.strokeRect(28, 28, width - 56, height - 56);

    context.fillStyle = "#1C2930";
    context.font = "700 42px Arial";
    context.textAlign = "center";
    context.fillText("LABTRACK", width / 2, 96);
    context.font = "600 24px Arial";
    context.fillText(asset.propertyNumber, width / 2, 140);
    context.drawImage(image, 180, 180, 360, 360);

    context.font = "700 30px Arial";
    context.fillText(asset.name, width / 2, 610);
    context.font = "22px Arial";
    context.fillText(asset.locationName, width / 2, 652);
    context.font = "16px Arial";
    context.fillText(payload, width / 2, 710);

    const link = document.createElement("a");
    link.download = `${asset.propertyNumber}-qr-label.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    URL.revokeObjectURL(svgUrl);
  };

  image.src = svgUrl;
}
