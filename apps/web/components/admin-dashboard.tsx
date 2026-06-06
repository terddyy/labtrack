"use client";

import {
  assetConditions,
  assetStatuses,
  createQrPayload,
  formatStatusLabel,
  getBookingWorkflowActions,
  getDashboardCounters,
  getDefectTransitions,
  getRoleDisplayLabel,
  type AssetCondition,
  type AssetStatus,
  type DefectStatus,
  type Profile,
  type QuickLoginAccount,
  type ReportType,
  type UserRole
} from "@labtrack/shared";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  LogIn,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Settings,
  Wrench
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  BorrowingCalendar,
  type BorrowingCalendarActionTarget,
  type BorrowingCalendarFilters
} from "@/components/admin/borrowing-calendar";
import { EmptyState, Metric, Notice, StatusBadge } from "@/components/admin/ui";
import {
  cancelBookingAction,
  checkoutBookingAction,
  createAllowedEmailDomainAction,
  createAssetAction,
  createCategoryAction,
  createLocationAction,
  decideBookingAction,
  generateAssetQrAction,
  getAdminAccessAction,
  getAdminDashboardDataAction,
  getBorrowingMonitorAction,
  getPrintableReportDataAction,
  getTicketMessagesAction,
  getUsageAnalyticsAction,
  listActivityLogsAction,
  returnBookingAction,
  sendTicketMessageAction,
  triageDefectReportAction,
  updateAllowedEmailDomainAction,
  updateProfileAccessAction,
  updateRegistrationPolicyAction
} from "@/lib/admin/actions";
import type {
  AdminAccessState,
  AssetFormState,
  AssetView,
  ActivityLogRow,
  BookingRow,
  BorrowingMonitorRow,
  CategoryRow,
  DashboardData,
  DefectRow,
  EmailDomainRule,
  FormErrors,
  LocationRow,
  PrintableReportRow,
  ProfileRow,
  RegistrationPolicy,
  UsageAnalyticsRow,
  TicketMessageRow,
  TicketThreadRow,
  AdminDashboardProps
} from "@/lib/admin/types";

const blankAssetForm: AssetFormState = {
  name: "",
  categoryId: "",
  locationId: "",
  condition: "good",
  status: "available",
  notes: "",
  imageFile: null
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

type AdminSection = "dashboard" | "assets" | "bookings" | "monitor" | "defects" | "tickets" | "reports" | "access" | "catalog";
type ReportFilterState = {
  from: string;
  to: string;
  locationId: string;
  assetId: string;
};

const navigation: Array<{ key: AdminSection; label: string; icon: typeof ClipboardCheck }> = [
  { key: "dashboard", label: "Dashboard", icon: ClipboardCheck },
  { key: "assets", label: "Assets & QR", icon: Package },
  { key: "bookings", label: "Borrowing", icon: CheckCircle2 },
  { key: "monitor", label: "Calendar", icon: CalendarDays },
  { key: "defects", label: "Defects", icon: Wrench },
  { key: "tickets", label: "Tickets", icon: MessageSquare },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "access", label: "Access", icon: ShieldCheck },
  { key: "catalog", label: "Catalog", icon: Settings }
];

const adminSectionKeys = new Set<AdminSection>(navigation.map((item) => item.key));

const reportTypeLabels: Record<ReportType, string> = {
  asset_management_summary: "Asset Management Summary",
  borrowing_transactions: "Borrowing Transactions",
  defect_reports: "Defect Reports",
  inventory: "Inventory Reports",
  equipment_utilization: "Equipment Utilization"
};

export function AdminDashboard({ initialAccess, initialData, quickLoginAccounts }: AdminDashboardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const shouldSkipInitialDashboardLoad = useRef(initialAccess.status === "authorized");
  const [access, setAccess] = useState<AdminAccessState>(initialAccess);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [quickLoginRole, setQuickLoginRole] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>(initialData);
  const [activeSection, setActiveSection] = useState<AdminSection>(() => parseAdminSection(searchParams.get("section")) ?? "dashboard");
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
  const [domainForm, setDomainForm] = useState({ domain: "", notes: "" });
  const [monitorFilters, setMonitorFilters] = useState<BorrowingCalendarFilters>(() => createDefaultMonitorFilters());
  const [monitorRows, setMonitorRows] = useState<BorrowingMonitorRow[]>([]);
  const [monitorMessage, setMonitorMessage] = useState<string | null>(null);
  const [isLoadingMonitor, setIsLoadingMonitor] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilterState>(() => createDefaultReportFilters());
  const [reportType, setReportType] = useState<ReportType>("asset_management_summary");
  const [usageRows, setUsageRows] = useState<UsageAnalyticsRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityLogRow[]>([]);
  const [printableRows, setPrintableRows] = useState<PrintableReportRow[]>([]);
  const [reportsMessage, setReportsMessage] = useState<string | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

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

  useEffect(() => {
    const nextSection = parseAdminSection(searchParams.get("section")) ?? "dashboard";
    setActiveSection((currentSection) => currentSection === nextSection ? currentSection : nextSection);
  }, [searchParams]);

  const handleSectionChange = useCallback((section: AdminSection) => {
    setActiveSection(section);

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("section", section);
    router.push(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

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

  const loadBorrowingMonitor = useCallback(async () => {
    setIsLoadingMonitor(true);
    setMonitorMessage(null);

    try {
      const result = await getBorrowingMonitorAction({
        from: toIsoFromDateTimeInput(monitorFilters.from),
        to: toIsoFromDateTimeInput(monitorFilters.to),
        locationId: monitorFilters.locationId || null,
        resourceId: monitorFilters.resourceId || null,
        statuses: monitorFilters.status === "all" ? null : [monitorFilters.status]
      });

      if (result.error || !result.data) {
        setMonitorMessage(result.error ?? "Unable to load borrowing monitor.");
        setIsLoadingMonitor(false);
        return;
      }

      setMonitorRows(result.data);
    } catch (error) {
      setMonitorMessage(error instanceof Error ? error.message : "Unable to load borrowing monitor.");
    }

    setIsLoadingMonitor(false);
  }, [monitorFilters]);

  const loadReportsData = useCallback(async () => {
    setIsLoadingReports(true);
    setReportsMessage(null);

    try {
      const baseFilters = {
        from: toIsoFromDateTimeInput(reportFilters.from),
        to: toIsoFromDateTimeInput(reportFilters.to),
        locationId: reportFilters.locationId || null,
        assetId: reportFilters.assetId || null
      };
      const [analyticsResult, activityResult, printableResult] = await Promise.all([
        getUsageAnalyticsAction(baseFilters),
        listActivityLogsAction({ from: baseFilters.from, to: baseFilters.to, limit: 80, offset: 0 }),
        getPrintableReportDataAction({ ...baseFilters, reportType })
      ]);
      const error = analyticsResult.error ?? activityResult.error ?? printableResult.error;

      if (error || !analyticsResult.data || !activityResult.data || !printableResult.data) {
        setReportsMessage(error ?? "Unable to load reports.");
        setIsLoadingReports(false);
        return;
      }

      setUsageRows(analyticsResult.data);
      setActivityRows(activityResult.data);
      setPrintableRows(printableResult.data);
    } catch (error) {
      setReportsMessage(error instanceof Error ? error.message : "Unable to load reports.");
    }

    setIsLoadingReports(false);
  }, [reportFilters, reportType]);

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

  useEffect(() => {
    if (access.status === "authorized" && activeSection === "monitor") {
      void loadBorrowingMonitor();
    }
  }, [access.status, activeSection, loadBorrowingMonitor]);

  useEffect(() => {
    if (access.status === "authorized" && activeSection === "reports" && !usageRows.length && !isLoadingReports) {
      void loadReportsData();
    }
  }, [access.status, activeSection, isLoadingReports, loadReportsData, usageRows.length]);

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

    const result = await createAssetAction(new FormData(event.currentTarget));

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
    if (activeSection === "monitor") {
      await loadBorrowingMonitor();
    }
    if (activeSection === "reports") {
      await loadReportsData();
    }
    if (selectedThreadId) {
      await loadThreadMessages(selectedThreadId);
    }
    setDashboardMessage(successMessage);
    setIsMutatingWorkflow(false);
  }

  async function handleBookingDecision(booking: { id: string }, status: "approved" | "rejected") {
    await runWorkflowMutation(
      () => decideBookingAction(booking.id, status),
      `Borrowing ${status}.`
    );
  }

  async function handleBookingCheckout(booking: { id: string }) {
    await runWorkflowMutation(
      () => checkoutBookingAction(booking.id),
      "Borrowing checked out."
    );
  }

  async function handleBookingReturn(booking: { id: string }) {
    await runWorkflowMutation(
      () => returnBookingAction(booking.id),
      "Borrowing returned."
    );
  }

  async function handleBookingCancel(booking: { id: string }) {
    await runWorkflowMutation(
      () => cancelBookingAction(booking.id),
      "Borrowing cancelled."
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

  async function handleRegistrationPolicyUpdate(enabled: boolean) {
    if (authorizedProfile?.role !== "super_admin") {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await updateRegistrationPolicyAction(enabled);

    if (error) {
      setDashboardMessage(error);
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    setDashboardMessage("Registration policy updated.");
    setIsMutatingWorkflow(false);
  }

  async function handleCreateAllowedEmailDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authorizedProfile?.role !== "super_admin" || !domainForm.domain.trim()) {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await createAllowedEmailDomainAction(domainForm.domain, domainForm.notes);

    if (error) {
      setDashboardMessage(error);
      setIsMutatingWorkflow(false);
      return;
    }

    setDomainForm({ domain: "", notes: "" });
    await loadDashboardData();
    setDashboardMessage("Allowed email domain added.");
    setIsMutatingWorkflow(false);
  }

  async function handleAllowedEmailDomainUpdate(domainRule: EmailDomainRule, updates: Partial<Pick<EmailDomainRule, "domain" | "is_allowed" | "notes">>) {
    if (authorizedProfile?.role !== "super_admin") {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await updateAllowedEmailDomainAction(domainRule.id, updates);

    if (error) {
      setDashboardMessage(error);
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    setDashboardMessage("Allowed email domain updated.");
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
        <nav className="nav" aria-label="Custodian sections">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={activeSection === item.key ? "page" : undefined}
                className={activeSection === item.key ? "active" : ""}
                key={item.label}
                onClick={() => handleSectionChange(item.key)}
                type="button"
              >
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
            <p className="muted">Manage QR-tagged equipment, faculty and student borrowing, defect reports, and ticket communication.</p>
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
          <span>{access.profile.fullName} · {getRoleDisplayLabel(access.profile.role)}</span>
          <StatusBadge status={access.profile.role} />
        </div>

        {dashboardMessage ? <Notice tone={dashboardMessage.includes("created") || dashboardMessage.includes("updated") ? "success" : "warning"}>{dashboardMessage}</Notice> : null}

        <section className="metrics" aria-label="Operational summary">
          <Metric label="Registered assets" value={counters.registeredAssets.toString()} />
          <Metric label="Pending borrowing" value={counters.pendingBookings.toString()} />
          <Metric label="Open defects" value={counters.openDefects.toString()} />
          <Metric label="Active QR codes" value={counters.activeQrCodes.toString()} />
        </section>

        {activeSection === "dashboard" ? (
          <section className="grid" style={{ marginTop: 18 }}>
            <WorkflowPanel title="Borrowing queue" items={data.bookings.slice(0, 8).map((booking) => ({
              id: booking.id,
              title: formatBookingResource(booking, data.assets, data.locations),
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
                    <tr aria-selected={asset.id === selectedAsset?.id} className={asset.id === selectedAsset?.id ? "selected-row" : ""} key={asset.id}>
                      <td>
                        <div className="asset-title-row">
                          <AssetThumb asset={asset} />
                          <div>
                            <strong>{asset.name}</strong>
                            <p className="muted">{asset.categoryName}</p>
                          </div>
                        </div>
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
                <p className="muted">Custodian-generated code for mobile scanning.</p>
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
            locations={data.locations}
            onApprove={(booking) => void handleBookingDecision(booking, "approved")}
            onCancel={(booking) => void handleBookingCancel(booking)}
            onCheckout={(booking) => void handleBookingCheckout(booking)}
            onReject={(booking) => void handleBookingDecision(booking, "rejected")}
            onReturn={(booking) => void handleBookingReturn(booking)}
            profiles={data.profiles}
          />
        ) : null}

        {activeSection === "monitor" ? (
          <BorrowingCalendar
            actionsDisabled={isMutatingWorkflow}
            assets={data.assets}
            disabled={isLoadingMonitor}
            filters={monitorFilters}
            locations={data.locations}
            message={monitorMessage}
            onApprove={(booking: BorrowingCalendarActionTarget) => void handleBookingDecision(booking, "approved")}
            onCancel={(booking: BorrowingCalendarActionTarget) => void handleBookingCancel(booking)}
            onChangeFilters={setMonitorFilters}
            onCheckout={(booking: BorrowingCalendarActionTarget) => void handleBookingCheckout(booking)}
            onRefresh={() => void loadBorrowingMonitor()}
            onReject={(booking: BorrowingCalendarActionTarget) => void handleBookingDecision(booking, "rejected")}
            onReturn={(booking: BorrowingCalendarActionTarget) => void handleBookingReturn(booking)}
            rows={monitorRows}
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

        {activeSection === "reports" ? (
          <ReportsPanel
            activityRows={activityRows}
            assets={data.assets}
            disabled={isLoadingReports}
            filters={reportFilters}
            locations={data.locations}
            message={reportsMessage}
            onChangeFilters={setReportFilters}
            onChangeReportType={setReportType}
            onPrint={() => window.print()}
            onRefresh={() => void loadReportsData()}
            printableRows={printableRows}
            reportType={reportType}
            usageRows={usageRows}
          />
        ) : null}

        {activeSection === "access" ? (
          <AccessManagementPanel
            currentProfile={access.profile}
            disabled={isMutatingWorkflow}
            domainForm={domainForm}
            onCreateDomain={handleCreateAllowedEmailDomain}
            onDomainFormChange={setDomainForm}
            onDomainUpdate={handleAllowedEmailDomainUpdate}
            onRegistrationPolicyUpdate={(enabled) => void handleRegistrationPolicyUpdate(enabled)}
            onUpdate={handleProfileUpdate}
            profiles={data.profiles}
            registrationPolicy={data.registrationPolicy}
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
              {access.profile.fullName} does not have active Custodian access.
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
              <h1>Custodian sign in</h1>
              <p className="muted">Use an active Custodian or Super Admin account.</p>
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
  const errorId = (field: keyof AssetFormState) => errors[field] ? `${field}-error` : undefined;

  return (
    <form className="asset-form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="asset-name">Asset name</label>
        <input aria-describedby={errorId("name")} aria-invalid={Boolean(errors.name)} id="asset-name" name="name" onChange={(event) => onChange({ ...form, name: event.target.value })} value={form.name} />
        {errors.name ? <span className="field-error" id={errorId("name")}>{errors.name}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="asset-image">Asset image</label>
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={errorId("imageFile")}
          aria-invalid={Boolean(errors.imageFile)}
          id="asset-image"
          name="imageFile"
          onChange={() => onChange({ ...form })}
          type="file"
        />
        {errors.imageFile ? <span className="field-error" id={errorId("imageFile")}>{errors.imageFile}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="category">Category</label>
        <select aria-describedby={errorId("categoryId")} aria-invalid={Boolean(errors.categoryId)} id="category" name="categoryId" onChange={(event) => onChange({ ...form, categoryId: event.target.value })} required value={form.categoryId}>
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        {errors.categoryId ? <span className="field-error" id={errorId("categoryId")}>{errors.categoryId}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="location">Location</label>
        <select aria-describedby={errorId("locationId")} aria-invalid={Boolean(errors.locationId)} id="location" name="locationId" onChange={(event) => onChange({ ...form, locationId: event.target.value })} required value={form.locationId}>
          <option value="">Select location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
        {errors.locationId ? <span className="field-error" id={errorId("locationId")}>{errors.locationId}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="condition">Condition</label>
        <select id="condition" name="condition" onChange={(event) => onChange({ ...form, condition: event.target.value as AssetCondition })} value={form.condition}>
          {assetConditions.map((condition) => (
            <option key={condition} value={condition}>{formatLabel(condition)}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" onChange={(event) => onChange({ ...form, status: event.target.value as AssetStatus })} value={form.status}>
          {assetStatuses.map((status) => (
            <option key={status} value={status}>{formatLabel(status)}</option>
          ))}
        </select>
      </div>
      <div className="field span-2">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" onChange={(event) => onChange({ ...form, notes: event.target.value })} rows={3} value={form.notes} />
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
  const mobileDeepLink = payload ? `labtrack://asset/${encodeURIComponent(payload)}` : "";

  return (
    <>
      <div className="qr-frame" ref={qrContainerRef}>
        {payload ? <QRCodeSVG value={payload} size={190} level="M" includeMargin /> : <EmptyState label="No active QR code." />}
      </div>
      <div className="form-grid">
        <div className="asset-preview-card">
          <AssetThumb asset={asset} large />
          <div>
            <h3>{asset?.name ?? "Select an asset"}</h3>
            <p className="muted">{asset ? `${asset.propertyNumber} · ${asset.categoryName}` : "No asset selected"}</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="qr-payload">QR payload</label>
          <input id="qr-payload" readOnly value={payload} />
        </div>
        <div className="field">
          <label htmlFor="qr-mobile-link">Mobile asset link</label>
          <input id="qr-mobile-link" readOnly value={mobileDeepLink} />
        </div>
      </div>
    </>
  );
}

function AssetThumb({ asset, large = false }: { asset: AssetView | null; large?: boolean }) {
  const [didImageFail, setDidImageFail] = useState(false);
  const imageUrl = asset?.primaryImageUrl ?? null;
  const showImage = Boolean(imageUrl && !didImageFail);

  useEffect(() => {
    setDidImageFail(false);
  }, [imageUrl]);

  return (
    <div className={`asset-thumb ${large ? "large" : ""} ${showImage ? "" : "fallback"}`} aria-hidden={!asset}>
      {showImage && imageUrl ? (
        <img alt={`${asset?.name ?? "LABTRACK asset"} image`} onError={() => setDidImageFail(true)} src={imageUrl} />
      ) : (
        <span>{asset ? getAssetInitials(asset.name) : "LT"}</span>
      )}
    </div>
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
  locations,
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
  locations: LocationRow[];
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
          <h2>Borrowing queue</h2>
          <p className="muted">Approve, reject, check out, return, or cancel faculty and student requests.</p>
        </div>
      </div>
      <div className="panel-body timeline">
        {bookings.length ? bookings.map((booking) => {
          const borrower = profiles.find((profile) => profile.id === booking.instructor_id);
          const actions = getBookingWorkflowActions(booking.status);
          return (
            <article className="timeline-item" key={booking.id}>
              <div className="topbar compact">
                <div>
                  <h3>{formatBookingResource(booking, assets, locations)}</h3>
                  <p className="muted">{borrower?.full_name ?? "Unknown borrower"}</p>
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
        }) : <EmptyState label="No borrowing requests found." />}
      </div>
    </div>
  );
}

function ReportsPanel({
  activityRows,
  assets,
  disabled,
  filters,
  locations,
  message,
  onChangeFilters,
  onChangeReportType,
  onPrint,
  onRefresh,
  printableRows,
  reportType,
  usageRows
}: {
  activityRows: ActivityLogRow[];
  assets: AssetView[];
  disabled: boolean;
  filters: ReportFilterState;
  locations: LocationRow[];
  message: string | null;
  onChangeFilters: (filters: ReportFilterState) => void;
  onChangeReportType: (reportType: ReportType) => void;
  onPrint: () => void;
  onRefresh: () => void;
  printableRows: PrintableReportRow[];
  reportType: ReportType;
  usageRows: UsageAnalyticsRow[];
}) {
  return (
    <section className="report-layout">
      <div className="panel no-print">
        <div className="panel-header">
          <div>
            <h2>Printable reports</h2>
            <p className="muted">Generate summaries for borrowing, inventory, defects, and utilization.</p>
          </div>
          <div className="actions">
            <button className="button secondary" disabled={disabled} onClick={onRefresh} type="button">
              <RefreshCw size={15} />
              {disabled ? "Loading" : "Refresh"}
            </button>
            <button className="button primary" disabled={!printableRows.length} onClick={onPrint} type="button">
              <Printer size={15} />
              Print
            </button>
          </div>
        </div>
        <div className="panel-body">
          <div className="filter-grid">
            <div className="field">
              <label htmlFor="report-type">Report</label>
              <select id="report-type" onChange={(event) => onChangeReportType(event.target.value as ReportType)} value={reportType}>
                {(Object.keys(reportTypeLabels) as ReportType[]).map((type) => (
                  <option key={type} value={type}>{reportTypeLabels[type]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="report-from">From</label>
              <input id="report-from" onChange={(event) => onChangeFilters({ ...filters, from: event.target.value })} type="datetime-local" value={filters.from} />
            </div>
            <div className="field">
              <label htmlFor="report-to">To</label>
              <input id="report-to" onChange={(event) => onChangeFilters({ ...filters, to: event.target.value })} type="datetime-local" value={filters.to} />
            </div>
            <div className="field">
              <label htmlFor="report-location">Room/Lab</label>
              <select id="report-location" onChange={(event) => onChangeFilters({ ...filters, locationId: event.target.value })} value={filters.locationId}>
                <option value="">All rooms and labs</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="report-asset">Equipment</label>
              <select id="report-asset" onChange={(event) => onChangeFilters({ ...filters, assetId: event.target.value })} value={filters.assetId}>
                <option value="">All equipment</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>{asset.name}</option>
                ))}
              </select>
            </div>
          </div>
          {message ? <Notice tone="warning">{message}</Notice> : null}
        </div>
      </div>

      <div className="metrics report-metrics no-print" aria-label="Report analytics">
        {usageRows.length ? usageRows.map((row) => (
          <Metric key={`${row.metric}-${row.label}`} label={row.label} value={formatMetricValue(row)} />
        )) : (
          <>
            <Metric label="Borrowing transactions" value="0" />
            <Metric label="Equipment utilization" value="0%" />
            <Metric label="Reporting hours" value="08:00-17:00" />
            <Metric label="Activity logs" value={activityRows.length.toString()} />
          </>
        )}
      </div>

      <div className="panel printable-report">
        <div className="panel-header">
          <div>
            <p className="eyebrow">LABTRACK Report</p>
            <h2>{reportTypeLabels[reportType]}</h2>
            <p className="muted">{formatDateTimeRange(filters.from, filters.to)}</p>
          </div>
        </div>
        <div className="panel-body timeline">
          {printableRows.length ? printableRows.map((row) => (
            <article className="timeline-item report-section" key={`${row.report_type}-${row.section}`}>
              <h3>{formatLabel(row.section)}</h3>
              <pre>{formatReportPayload(row.payload)}</pre>
            </article>
          )) : <EmptyState label={disabled ? "Loading report data." : "No report data found."} />}
        </div>
      </div>

      <div className="panel no-print">
        <div className="panel-header">
          <h2>User activity logs</h2>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {activityRows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>{row.actor_name ?? row.actor_email ?? "System"}</td>
                  <td>{formatLabel(row.action)}</td>
                  <td>{row.entity_table}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!activityRows.length ? <EmptyState label="No activity logs found." /> : null}
        </div>
      </div>
    </section>
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
          const reporter = profiles.find((profile) => profile.id === report.instructor_id);
          const transitions = getDefectTransitions(report.status);
          return (
            <article className="timeline-item" key={report.id}>
              <div className="topbar compact">
                <div>
                  <h3>{report.title}</h3>
                  <p className="muted">{asset?.name ?? "Unknown asset"} · {reporter?.full_name ?? "Unknown reporter"}</p>
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
              <p className="muted">{thread.booking_id ? `Borrowing ${thread.booking_id}` : `Defect ${thread.defect_report_id}`}</p>
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
  domainForm,
  onCreateDomain,
  onDomainFormChange,
  onDomainUpdate,
  onRegistrationPolicyUpdate,
  onUpdate,
  profiles,
  registrationPolicy
}: {
  currentProfile: Profile;
  disabled: boolean;
  domainForm: { domain: string; notes: string };
  onCreateDomain: (event: FormEvent<HTMLFormElement>) => void;
  onDomainFormChange: (form: { domain: string; notes: string }) => void;
  onDomainUpdate: (domainRule: EmailDomainRule, updates: Partial<Pick<EmailDomainRule, "domain" | "is_allowed" | "notes">>) => void;
  onRegistrationPolicyUpdate: (enabled: boolean) => void;
  onUpdate: (profile: ProfileRow, updates: Partial<Pick<ProfileRow, "role" | "is_active">>) => void;
  profiles: ProfileRow[];
  registrationPolicy: RegistrationPolicy;
}) {
  if (currentProfile.role !== "super_admin") {
    return (
      <div className="panel">
        <div className="panel-body">
          <Notice tone="warning">Only Super Admin accounts can manage account access.</Notice>
        </div>
      </div>
    );
  }

  return (
    <section className="grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Registration policy</h2>
            <p className="muted">Control who can create a new LABTRACK mobile account.</p>
          </div>
        </div>
        <div className="panel-body registration-policy">
          <label className="switch-row">
            <input
              checked={registrationPolicy.restrictSignupToAllowedDomains}
              disabled={disabled}
              onChange={(event) => onRegistrationPolicyUpdate(event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Restrict new registration to allowed school domains</strong>
              <span className="muted">
                {registrationPolicy.restrictSignupToAllowedDomains
                  ? "Only emails from active domains can register."
                  : "Any valid email domain can register."}
              </span>
            </span>
          </label>

          <form className="domain-form" onSubmit={onCreateDomain}>
            <div className="field">
              <label htmlFor="allowed-domain">Allowed domain</label>
              <input
                id="allowed-domain"
                onChange={(event) => onDomainFormChange({ ...domainForm, domain: event.target.value })}
                placeholder="pampangastateu.edu.ph"
                value={domainForm.domain}
              />
            </div>
            <div className="field">
              <label htmlFor="allowed-domain-notes">Notes</label>
              <input
                id="allowed-domain-notes"
                onChange={(event) => onDomainFormChange({ ...domainForm, notes: event.target.value })}
                placeholder="Main university domain"
                value={domainForm.notes}
              />
            </div>
            <button className="button primary" disabled={disabled || !domainForm.domain.trim()} type="submit">
              Add domain
            </button>
          </form>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {registrationPolicy.allowedDomains.map((domainRule) => (
                <tr key={domainRule.id}>
                  <td>{domainRule.domain}</td>
                  <td>{domainRule.notes ?? "No notes"}</td>
                  <td>
                    <button
                      className="button secondary"
                      disabled={disabled}
                      onClick={() => onDomainUpdate(domainRule, { is_allowed: !domainRule.is_allowed })}
                      type="button"
                    >
                      {domainRule.is_allowed ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!registrationPolicy.allowedDomains.length ? <EmptyState label="No allowed domains configured." /> : null}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Access management</h2>
            <p className="muted">Assign Custodian, Faculty, Student, and Super Admin access.</p>
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
                      <option value="faculty">Faculty</option>
                      <option value="student">Student</option>
                      <option value="custodian">Custodian</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="instructor">Faculty</option>
                      <option value="admin">Custodian</option>
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
    </section>
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

function createDefaultMonitorFilters(): BorrowingCalendarFilters {
  const from = new Date();
  from.setMinutes(0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);

  return {
    from: toDateTimeLocalInput(from),
    to: toDateTimeLocalInput(to),
    locationId: "",
    resourceId: "",
    status: "all"
  };
}

function createDefaultReportFilters(): ReportFilterState {
  const to = new Date();
  to.setHours(17, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  from.setHours(8, 0, 0, 0);

  return {
    from: toDateTimeLocalInput(from),
    to: toDateTimeLocalInput(to),
    locationId: "",
    assetId: ""
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

function parseAdminSection(value: string | null): AdminSection | null {
  if (!value) {
    return null;
  }

  return adminSectionKeys.has(value as AdminSection) ? value as AdminSection : null;
}

function formatLabel(value: string) {
  return formatStatusLabel(value);
}

function getAssetInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "LT";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatDateTimeRange(from: string, to: string) {
  try {
    return `${formatDateTime(toIsoFromDateTimeInput(from))} - ${formatDateTime(toIsoFromDateTimeInput(to))}`;
  } catch {
    return "Invalid date range";
  }
}

function toDateTimeLocalInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoFromDateTimeInput(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error("Date filter is invalid.");
  }

  return date.toISOString();
}

function formatBookingResource(booking: BookingRow, assets: AssetView[], locations: LocationRow[]) {
  if (booking.resource_type === "room") {
    return locations.find((location) => location.id === booking.location_id)?.name ?? "Unknown room";
  }

  return assets.find((asset) => asset.id === booking.asset_id)?.name ?? "Unknown equipment";
}

function formatMetricValue(row: UsageAnalyticsRow) {
  const value = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(row.value);

  if (row.unit === "percent") {
    return `${value}%`;
  }

  if (row.unit === "count") {
    return value;
  }

  return `${value} ${row.unit}`;
}

function formatReportPayload(payload: Record<string, unknown>) {
  return JSON.stringify(payload, null, 2);
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
