"use client";

import {
  assetConditions,
  assetStatuses,
  createQrPayload,
  formatStatusLabel,
  getBookingWorkflowActions,
  getDashboardCounters,
  getDefectTransitions,
  type AssetCondition,
  type AssetStatus,
  type DefectStatus,
  type Profile,
  type QuickLoginAccount,
  type UserRole
} from "@labtrack/shared";
import {
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
import { EmptyState, Metric, Notice, StatusBadge } from "@/components/admin/ui";
import {
  cancelBookingAction,
  checkoutBookingAction,
  createAssetAction,
  createCategoryAction,
  createLocationAction,
  decideBookingAction,
  generateAssetQrAction,
  getAdminAccessAction,
  getAdminDashboardDataAction,
  getTicketMessagesAction,
  returnBookingAction,
  sendTicketMessageAction,
  triageDefectReportAction,
  updateProfileAccessAction
} from "@/lib/admin/actions";
import type {
  AdminAccessState,
  AssetFormState,
  AssetView,
  BookingRow,
  CategoryRow,
  DashboardData,
  DefectRow,
  FormErrors,
  LocationRow,
  ProfileRow,
  TicketMessageRow,
  TicketThreadRow,
  AdminDashboardProps
} from "@/lib/admin/types";

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

export function AdminDashboard({ initialAccess, initialData, quickLoginAccounts }: AdminDashboardProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const shouldSkipInitialDashboardLoad = useRef(initialAccess.status === "authorized");
  const [access, setAccess] = useState<AdminAccessState>(initialAccess);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [quickLoginRole, setQuickLoginRole] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>(initialData);
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

  const counters = useMemo(() => data.counters ?? getDashboardCounters({
    assets: data.assets,
    bookings: data.bookings,
    defects: data.defects
  }), [data]);

  const authorizedProfile = access.status === "authorized" ? access.profile : null;

  const loadAccess = useCallback(async () => {
    if (!supabase) {
      setAccess({ status: "missing-config" });
      return;
    }

    setAccess({ status: "checking" });
    setAuthMessage(null);
    setAccess(await getAdminAccessAction());
  }, [supabase]);

  const loadDashboardData = useCallback(async () => {
    setIsLoadingData(true);
    setDashboardMessage(null);

    const result = await getAdminDashboardDataAction();

    if (result.error || !result.data) {
      setDashboardMessage(result.error ?? "Unable to load dashboard data.");
      setIsLoadingData(false);
      return;
    }

    const nextData = result.data;
    setData(nextData);
    setSelectedAssetId((current) => {
      if (current && nextData.assets.some((asset) => asset.id === current)) {
        return current;
      }

      return nextData.assets[0]?.id ?? null;
    });
    setIsLoadingData(false);
  }, []);

  const loadThreadMessages = useCallback(async (threadId: string | null) => {
    if (!threadId) {
      setThreadMessages([]);
      return;
    }

    const result = await getTicketMessagesAction(threadId);

    if (result.error || !result.data) {
      setDashboardMessage(result.error ?? "Unable to load ticket messages.");
      return;
    }

    setThreadMessages(result.data);
  }, []);

  useEffect(() => {
    if (access.status === "authorized") {
      if (shouldSkipInitialDashboardLoad.current) {
        shouldSkipInitialDashboardLoad.current = false;
        return;
      }

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
    setData(emptyDashboardData);
    setSelectedAssetId(null);
    setSelectedThreadId(null);
    setThreadMessages([]);
    setAccess({ status: "signed-out" });
  }

  async function handleCreateAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!authorizedProfile) {
      return;
    }

    setIsSavingAsset(true);
    setFormErrors({});
    setDashboardMessage(null);

    const result = await createAssetAction(assetForm);

    if (result.error || !result.data) {
      setDashboardMessage(result.error ?? "Unable to create asset.");
      setIsSavingAsset(false);
      return;
    }

    if ("formErrors" in result.data) {
      setFormErrors(toFormErrors(result.data.formErrors ?? []));
      setIsSavingAsset(false);
      return;
    }

    setAssetForm(blankAssetForm);
    setIsAssetFormOpen(false);
    await loadDashboardData();
    setSelectedAssetId(result.data.id);
    setDashboardMessage("Asset created.");
    setIsSavingAsset(false);
  }

  async function handleGenerateQr(asset: AssetView | null) {
    if (!authorizedProfile || !asset) {
      return;
    }

    if (asset.activeQr) {
      setDashboardMessage("This asset already has an active QR code.");
      return;
    }

    await writeAssetQrCode(asset, "QR code updated.");
  }

  async function handleRegenerateQr(asset: AssetView | null) {
    if (!authorizedProfile || !asset) {
      return;
    }

    await writeAssetQrCode(asset, asset.activeQr ? "QR code regenerated." : "QR code updated.");
  }

  async function writeAssetQrCode(asset: AssetView, successMessage: string) {
    setIsWritingQr(true);
    setDashboardMessage(null);

    const result = await generateAssetQrAction(asset.id);

    if (result.error) {
      setDashboardMessage(`${result.error} Refreshing asset data.`);
      await loadDashboardData();
      setIsWritingQr(false);
      return;
    }

    await loadDashboardData();
    setSelectedAssetId(asset.id);
    setDashboardMessage(successMessage);
    setIsWritingQr(false);
  }

  async function runWorkflowMutation(action: () => PromiseLike<{ error: string | null }>, successMessage: string) {
    setIsMutatingWorkflow(true);
    setDashboardMessage(null);

    const { error } = await action();

    if (error) {
      setDashboardMessage(error);
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
    await runWorkflowMutation(
      () => decideBookingAction(booking.id, status),
      `Booking ${status}.`
    );
  }

  async function handleBookingCheckout(booking: BookingRow) {
    await runWorkflowMutation(
      () => checkoutBookingAction(booking.id),
      "Booking checked out."
    );
  }

  async function handleBookingReturn(booking: BookingRow) {
    await runWorkflowMutation(
      () => returnBookingAction(booking.id),
      "Booking returned."
    );
  }

  async function handleBookingCancel(booking: BookingRow) {
    await runWorkflowMutation(
      () => cancelBookingAction(booking.id),
      "Booking cancelled."
    );
  }

  async function handleDefectTriage(report: DefectRow, status: "under_review" | "sent_for_repair" | "resolved" | "rejected") {
    await runWorkflowMutation(
      () => triageDefectReportAction(report.id, status, formatLabel(status)),
      `Defect marked ${formatLabel(status)}.`
    );
  }

  async function handleSendTicketMessage() {
    if (!selectedThreadId || !ticketBody.trim()) {
      return;
    }

    setIsMutatingWorkflow(true);
    setDashboardMessage(null);

    const { error } = await sendTicketMessageAction(selectedThreadId, ticketBody.trim());

    if (error) {
      setDashboardMessage(error);
      setIsMutatingWorkflow(false);
      return;
    }

    setTicketBody("");
    await loadThreadMessages(selectedThreadId);
    setDashboardMessage("Message sent.");
    setIsMutatingWorkflow(false);
  }

  async function handleProfileUpdate(profile: ProfileRow, updates: Partial<Pick<ProfileRow, "role" | "is_active">>) {
    if (authorizedProfile?.role !== "super_admin") {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await updateProfileAccessAction(profile, updates);

    if (error) {
      setDashboardMessage(error);
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    setDashboardMessage("Profile updated.");
    setIsMutatingWorkflow(false);
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!categoryName.trim()) {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await createCategoryAction(categoryName);

    if (error) {
      setDashboardMessage(error);
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

    if (!locationName.trim()) {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await createLocationAction(locationName);

    if (error) {
      setDashboardMessage(error);
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
        quickLoginAccounts={quickLoginAccounts}
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
          <Metric label="Registered assets" value={counters.registeredAssets.toString()} />
          <Metric label="Pending bookings" value={counters.pendingBookings.toString()} />
          <Metric label="Open defects" value={counters.openDefects.toString()} />
          <Metric label="Active QR codes" value={counters.activeQrCodes.toString()} />
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
  access: AdminAccessState;
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
          const actions = getBookingWorkflowActions(booking.status);
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
                {actions.includes("approve") ? <button className="button primary" disabled={disabled} onClick={() => onApprove(booking)} type="button">Approve</button> : null}
                {actions.includes("reject") ? <button className="button secondary" disabled={disabled} onClick={() => onReject(booking)} type="button">Reject</button> : null}
                {actions.includes("checkout") ? <button className="button primary" disabled={disabled} onClick={() => onCheckout(booking)} type="button">Check out</button> : null}
                {actions.includes("return") ? <button className="button primary" disabled={disabled} onClick={() => onReturn(booking)} type="button">Return</button> : null}
                {actions.includes("cancel") ? <button className="button secondary" disabled={disabled} onClick={() => onCancel(booking)} type="button">Cancel</button> : null}
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
          const transitions = getDefectTransitions(report.status);
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
              {transitions.length ? (
                <div className="actions">
                  {transitions.includes("under_review") ? <button className="button secondary" disabled={disabled} onClick={() => onTriage(report, "under_review")} type="button">Review</button> : null}
                  {transitions.includes("sent_for_repair") ? <button className="button secondary" disabled={disabled} onClick={() => onTriage(report, "sent_for_repair")} type="button">Send for repair</button> : null}
                  {transitions.includes("resolved") ? <button className="button primary" disabled={disabled} onClick={() => onTriage(report, "resolved")} type="button">Resolve</button> : null}
                  {transitions.includes("rejected") ? <button className="button secondary" disabled={disabled} onClick={() => onTriage(report, "rejected")} type="button">Reject</button> : null}
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

function toFormErrors(issues: Array<{ path: PropertyKey[]; message: string }>): FormErrors {
  return issues.reduce<FormErrors>((errors, issue) => {
    const key = issue.path[0];

    if (typeof key === "string" && key in blankAssetForm) {
      errors[key as keyof AssetFormState] = issue.message;
    }

    return errors;
  }, {});
}

function formatLabel(value: string) {
  return formatStatusLabel(value);
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
