"use client";

import {
  createQrPayload,
  getDashboardCounters,
  type QuickLoginAccount
} from "@labtrack/shared";
import { Download, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  BorrowingCalendar,
  type BorrowingCalendarActionTarget,
  type BorrowingCalendarFilters
} from "@/components/admin/borrowing-calendar";
import { Notice, type NoticeTone } from "@/components/admin/ui";
import { AccessShell } from "@/components/auth/access-shell";
import { AppShell, navigation, type AdminSection } from "@/components/app-shell";
import { DashboardOverview } from "@/components/dashboard/overview";
import { AssetForm } from "@/components/assets/asset-form";
import { AssetTable } from "@/components/assets/asset-table";
import { QrPreview } from "@/components/assets/qr-preview";
import { BookingAdminPanel } from "@/components/bookings/booking-admin-panel";
import { DefectAdminPanel } from "@/components/defects/defect-admin-panel";
import { TicketAdminPanel } from "@/components/tickets/ticket-admin-panel";
import { AccessManagementPanel } from "@/components/access/access-management-panel";
import { CatalogPanel } from "@/components/catalog/catalog-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toDateTimeLocalInput, toIsoFromDateTimeInput } from "@/lib/admin/format";
import {
  cancelBookingAction,
  checkoutBookingAction,
  createAllowedEmailDomainAction,
  createAssetAction,
  createCategoryAction,
  createGeneralTicketAction,
  createLocationAction,
  decideBookingAction,
  generateAssetQrAction,
  getAdminAccessAction,
  deleteAssetAction,
  deleteCatalogItemAction,
  getAdminDashboardDataAction,
  getAssetLifecycleAction,
  getBorrowingMonitorAction,
  getPrintableReportDataAction,
  getTicketMessagesAction,
  getUsageAnalyticsAction,
  listActivityLogsAction,
  renameCatalogItemAction,
  returnBookingAction,
  sendTicketMessageAction,
  triageDefectReportAction,
  updateAllowedEmailDomainAction,
  updateAssetAction,
  updateProfileAccessAction,
  updateRegistrationPolicyAction
} from "@/lib/admin/actions";
import {
  ASSET_LIFECYCLE_REPORT,
  ReportsPanel,
  type ReportView
} from "@/components/reports/reports-panel";
import type {
  AdminAccessState,
  AssetFormState,
  AssetLifecycleEvent,
  CatalogKind,
  AssetView,
  ActivityLogRow,
  BorrowingMonitorRow,
  DashboardData,
  DefectRow,
  EmailDomainRule,
  FormErrors,
  PrintableReportRow,
  ProfileRow,
  UsageAnalyticsRow,
  TicketMessageRow,
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

type ReportFilterState = { from: string; to: string; locationId: string; assetId: string };

const sectionCopy: Record<AdminSection, { title: string; description: string }> = {
  dashboard: {
    title: "Hardware asset command center",
    description: "Manage QR-tagged equipment, faculty and student borrowing, defect reports, and ticket communication."
  },
  assets: {
    title: "Assets & QR",
    description: "Register equipment and generate custodian QR labels for mobile scanning."
  },
  bookings: {
    title: "Borrowing",
    description: "Approve, reject, check out, return, or cancel faculty and student requests."
  },
  monitor: {
    title: "Calendar",
    description: "Week view for room and equipment reservations across the lab schedule."
  },
  defects: {
    title: "Defects",
    description: "Review reports and update asset repair status."
  },
  tickets: {
    title: "Tickets",
    description: "Respond to borrowing and defect conversation threads."
  },
  reports: {
    title: "Reports",
    description: "Generate summaries for borrowing, inventory, defects, and utilization."
  },
  access: {
    title: "Access",
    description: "Manage registration domains and account roles for LABTRACK users."
  },
  catalog: {
    title: "Catalog",
    description: "Maintain asset categories and lab locations used across the register."
  }
};

const adminSectionKeys = new Set<AdminSection>(navigation.map((item) => item.key));

type DashboardNotice = { text: string; tone: NoticeTone };

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
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<AssetView | null>(null);
  const [lifecycleEvents, setLifecycleEvents] = useState<AssetLifecycleEvent[]>([]);
  const hasRequestedReports = useRef(false);
  const [assetForm, setAssetForm] = useState<AssetFormState>(blankAssetForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [dashboardMessage, setDashboardMessage] = useState<DashboardNotice | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [domainForm, setDomainForm] = useState({ domain: "", notes: "" });
  const [monitorFilters, setMonitorFilters] = useState<BorrowingCalendarFilters>(() => createDefaultMonitorFilters());
  const [monitorRows, setMonitorRows] = useState<BorrowingMonitorRow[]>([]);
  const [monitorMessage, setMonitorMessage] = useState<string | null>(null);
  const [isLoadingMonitor, setIsLoadingMonitor] = useState(false);
  const [reportFilters, setReportFilters] = useState<ReportFilterState>(() => createDefaultReportFilters());
  const [reportType, setReportType] = useState<ReportView>("asset_management_summary");
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

  useEffect(() => {
    if (dashboardMessage) {
      if (dashboardMessage.tone === "success") {
        toast.success(dashboardMessage.text);
      } else if (dashboardMessage.tone === "danger" || dashboardMessage.tone === "warning") {
        toast.error(dashboardMessage.text);
      }
    }
  }, [dashboardMessage]);

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
      setDashboardMessage({ text: result.error ?? "Unable to load dashboard data.", tone: "warning" });
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
      setDashboardMessage({ text: result.error ?? "Unable to load ticket messages.", tone: "warning" });
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
    hasRequestedReports.current = true;
    setIsLoadingReports(true);
    setReportsMessage(null);

    try {
      const baseFilters = {
        from: toIsoFromDateTimeInput(reportFilters.from),
        to: toIsoFromDateTimeInput(reportFilters.to),
        locationId: reportFilters.locationId || null,
        assetId: reportFilters.assetId || null
      };

      if (reportType === ASSET_LIFECYCLE_REPORT && !baseFilters.assetId) {
        setLifecycleEvents([]);
        setReportsMessage("Select a piece of equipment to generate its lifecycle report.");
        setIsLoadingReports(false);
        return;
      }

      // Each section loads independently so one failing RPC does not blank the whole page.
      const [analyticsResult, activityResult, reportResult] = await Promise.all([
        getUsageAnalyticsAction(baseFilters),
        listActivityLogsAction({ from: baseFilters.from, to: baseFilters.to, limit: 80, offset: 0 }),
        reportType === ASSET_LIFECYCLE_REPORT
          ? getAssetLifecycleAction(baseFilters.assetId ?? "")
          : getPrintableReportDataAction({ ...baseFilters, reportType })
      ]);
      const errors = [analyticsResult.error, activityResult.error, reportResult.error].filter(Boolean);

      setUsageRows(analyticsResult.data ?? []);
      setActivityRows(activityResult.data ?? []);

      if (reportType === ASSET_LIFECYCLE_REPORT) {
        setLifecycleEvents((reportResult.data as AssetLifecycleEvent[] | null) ?? []);
        setPrintableRows([]);
      } else {
        setPrintableRows((reportResult.data as PrintableReportRow[] | null) ?? []);
        setLifecycleEvents([]);
      }

      if (errors.length) {
        setReportsMessage(errors.join(" "));
      }
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
    // Auto-run once per session; afterwards the user re-runs with the Run button.
    if (access.status === "authorized" && activeSection === "reports" && !hasRequestedReports.current) {
      void loadReportsData();
    }
  }, [access.status, activeSection, loadReportsData]);

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

    const formData = new FormData(event.currentTarget);
    const result = editingAssetId ? await updateAssetAction(editingAssetId, formData) : await createAssetAction(formData);

    if (result.error || !result.data) {
      setDashboardMessage({ text: result.error ?? "Unable to save asset.", tone: "warning" });
      setIsSavingAsset(false);
      return;
    }

    if ("formErrors" in result.data) {
      setFormErrors(toFormErrors(result.data.formErrors ?? []));
      setIsSavingAsset(false);
      return;
    }

    const wasEditing = Boolean(editingAssetId);
    setAssetForm(blankAssetForm);
    setEditingAssetId(null);
    setIsAssetFormOpen(false);
    await loadDashboardData();
    setSelectedAssetId(result.data.id);
    setDashboardMessage({ text: wasEditing ? "Asset updated." : "Asset created.", tone: "success" });
    setIsSavingAsset(false);
  }

  function openCreateAssetForm() {
    setEditingAssetId(null);
    setAssetForm(blankAssetForm);
    setFormErrors({});
    setIsAssetFormOpen(true);
  }

  function openEditAssetForm(asset: AssetView) {
    setEditingAssetId(asset.id);
    setAssetForm({
      name: asset.name,
      categoryId: asset.categoryId,
      locationId: asset.locationId,
      condition: asset.condition,
      status: asset.status,
      notes: asset.notes ?? "",
      imageFile: null
    });
    setFormErrors({});
    setIsAssetFormOpen(true);
  }

  async function handleDeleteAsset(asset: AssetView) {
    setIsMutatingWorkflow(true);
    const { error } = await deleteAssetAction(asset.id);

    if (error) {
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    setAssetPendingDelete(null);
    await loadDashboardData();
    setDashboardMessage({ text: "Asset deleted.", tone: "success" });
    setIsMutatingWorkflow(false);
  }

  async function handleRenameCatalogItem(kind: CatalogKind, id: string, name: string) {
    setIsMutatingWorkflow(true);
    const { error } = await renameCatalogItemAction(kind, id, name);

    if (error) {
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return false;
    }

    await loadDashboardData();
    setDashboardMessage({ text: kind === "category" ? "Category renamed." : "Location renamed.", tone: "success" });
    setIsMutatingWorkflow(false);
    return true;
  }

  async function handleDeleteCatalogItem(kind: CatalogKind, id: string) {
    setIsMutatingWorkflow(true);
    const { error } = await deleteCatalogItemAction(kind, id);

    if (error) {
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    setDashboardMessage({ text: kind === "category" ? "Category deleted." : "Location deleted.", tone: "success" });
    setIsMutatingWorkflow(false);
  }

  async function handleGenerateQr(asset: AssetView | null) {
    if (!authorizedProfile || !asset) {
      return;
    }

    if (asset.activeQr) {
      setDashboardMessage({ text: "This asset already has an active QR code.", tone: "warning" });
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
      setDashboardMessage({ text: `${result.error} Refreshing asset data.`, tone: "warning" });
      await loadDashboardData();
      setIsWritingQr(false);
      return;
    }

    await loadDashboardData();
    setSelectedAssetId(asset.id);
    setDashboardMessage({ text: successMessage, tone: "success" });
    setIsWritingQr(false);
  }

  async function runWorkflowMutation(action: () => PromiseLike<{ error: string | null }>, successMessage: string) {
    setIsMutatingWorkflow(true);
    setDashboardMessage(null);

    const { error } = await action();

    if (error) {
      setDashboardMessage({ text: error, tone: "warning" });
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
    setDashboardMessage({ text: successMessage, tone: "success" });
    setIsMutatingWorkflow(false);
  }

  async function handleBookingDecision(booking: { id: string }, status: "approved" | "rejected") {
    await runWorkflowMutation(() => decideBookingAction(booking.id, status), `Borrowing ${status}.`);
  }

  async function handleBookingCheckout(booking: { id: string }) {
    await runWorkflowMutation(() => checkoutBookingAction(booking.id), "Borrowing checked out.");
  }

  async function handleBookingReturn(booking: { id: string }) {
    await runWorkflowMutation(() => returnBookingAction(booking.id), "Borrowing returned.");
  }

  async function handleBookingCancel(booking: { id: string }) {
    await runWorkflowMutation(() => cancelBookingAction(booking.id), "Borrowing cancelled.");
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
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    setTicketBody("");
    await loadThreadMessages(selectedThreadId);
    setDashboardMessage({ text: "Message sent.", tone: "success" });
    setIsMutatingWorkflow(false);
  }

  async function handleCreateGeneralTicket(input: { requesterId: string; subject: string; body: string }) {
    setIsMutatingWorkflow(true);
    setDashboardMessage(null);

    const result = await createGeneralTicketAction(input.requesterId, input.subject, input.body);

    if (result.error || !result.data) {
      setDashboardMessage({ text: result.error ?? "Unable to start the conversation.", tone: "warning" });
      setIsMutatingWorkflow(false);
      return false;
    }

    await loadDashboardData();
    setSelectedThreadId(result.data);
    setDashboardMessage({ text: "Message sent.", tone: "success" });
    setIsMutatingWorkflow(false);
    return true;
  }

  async function handleProfileUpdate(profile: ProfileRow, updates: Partial<Pick<ProfileRow, "role" | "is_active">>) {
    if (authorizedProfile?.role !== "super_admin") {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await updateProfileAccessAction(profile, updates);

    if (error) {
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    setDashboardMessage({ text: "Profile updated.", tone: "success" });
    setIsMutatingWorkflow(false);
  }

  async function handleRegistrationPolicyUpdate(enabled: boolean) {
    if (authorizedProfile?.role !== "super_admin") {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await updateRegistrationPolicyAction(enabled);

    if (error) {
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    setDashboardMessage({ text: "Registration policy updated.", tone: "success" });
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
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    setDomainForm({ domain: "", notes: "" });
    await loadDashboardData();
    setDashboardMessage({ text: "Allowed email domain added.", tone: "success" });
    setIsMutatingWorkflow(false);
  }

  async function handleAllowedEmailDomainUpdate(domainRule: EmailDomainRule, updates: Partial<Pick<EmailDomainRule, "domain" | "is_allowed" | "notes">>) {
    if (authorizedProfile?.role !== "super_admin") {
      return;
    }

    setIsMutatingWorkflow(true);
    const { error } = await updateAllowedEmailDomainAction(domainRule.id, updates);

    if (error) {
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    await loadDashboardData();
    setDashboardMessage({ text: "Allowed email domain updated.", tone: "success" });
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
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    setCategoryName("");
    await loadDashboardData();
    setDashboardMessage({ text: "Category created.", tone: "success" });
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
      setDashboardMessage({ text: error, tone: "warning" });
      setIsMutatingWorkflow(false);
      return;
    }

    setLocationName("");
    await loadDashboardData();
    setDashboardMessage({ text: "Location created.", tone: "success" });
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
    <AppShell
      activeSection={activeSection}
      isLoadingData={isLoadingData}
      navBadges={{ bookings: counters.pendingBookings, defects: counters.openDefects }}
      onGenerateQr={() => void handleGenerateQr(selectedAsset)}
      onSectionChange={handleSectionChange}
      onSignOut={() => void handleSignOut()}
      onSync={() => void loadDashboardData()}
      profile={access.profile}
      qrDisabled={isWritingQr || !selectedAsset || Boolean(selectedAsset.activeQr)}
      sectionDescription={sectionCopy[activeSection].description}
      sectionTitle={sectionCopy[activeSection].title}
      showGenerateQr={activeSection === "assets" && Boolean(selectedAsset) && !selectedAsset?.activeQr}
    >
      {dashboardMessage?.tone === "neutral" ? <Notice tone="neutral">{dashboardMessage.text}</Notice> : null}

      {activeSection === "dashboard" ? (
        <DashboardOverview
          counters={counters}
          data={data}
          firstName={access.profile.fullName.split(/\s+/)[0] ?? access.profile.fullName}
          onNavigate={handleSectionChange}
          onOpenThread={(threadId) => {
            setSelectedThreadId(threadId);
            handleSectionChange("tickets");
          }}
        />
      ) : null}

      {activeSection === "assets" ? (
        <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <AssetTable
            assets={data.assets}
            isLoading={isLoadingData}
            onCreate={openCreateAssetForm}
            onSelect={setSelectedAssetId}
            selectedAssetId={selectedAsset?.id ?? null}
          />

          <aside className="overflow-hidden rounded-xl border bg-card xl:sticky xl:top-20">
            <QrPreview asset={selectedAsset} />
            <div className="grid grid-cols-2 gap-2 border-t p-4">
              <Button disabled={!selectedAsset} onClick={() => selectedAsset && openEditAssetForm(selectedAsset)} type="button" variant="outline">
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                className="text-destructive hover:text-destructive"
                disabled={!selectedAsset || isMutatingWorkflow}
                onClick={() => setAssetPendingDelete(selectedAsset)}
                type="button"
                variant="outline"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
              <Button disabled={!selectedAsset?.activeQr} onClick={() => downloadQrLabel(selectedAsset)} type="button">
                <Download className="size-4" />
                PNG label
              </Button>
              <Button
                disabled={isWritingQr || !selectedAsset}
                onClick={() => void handleRegenerateQr(selectedAsset)}
                type="button"
                variant="outline"
              >
                <RefreshCw className={isWritingQr ? "size-4 animate-spin" : "size-4"} />
                {selectedAsset?.activeQr ? "Regenerate" : "Generate"}
              </Button>
            </div>
          </aside>

          <Dialog onOpenChange={setIsAssetFormOpen} open={isAssetFormOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingAssetId ? "Edit asset" : "Register asset"}</DialogTitle>
                <DialogDescription>
                  {editingAssetId
                    ? "Update details, location, or status. Choose an image only to replace the current one."
                    : "Property and serial numbers are generated automatically. A QR label can be issued right after."}
                </DialogDescription>
              </DialogHeader>
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
                submitLabel={editingAssetId ? "Save changes" : "Create asset"}
              />
            </DialogContent>
          </Dialog>

          <Dialog onOpenChange={(open) => !open && setAssetPendingDelete(null)} open={Boolean(assetPendingDelete)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete asset?</DialogTitle>
                <DialogDescription>
                  {assetPendingDelete?.name} ({assetPendingDelete?.propertyNumber}) and its QR label will be permanently removed.
                  Assets with borrowing or defect history cannot be deleted; set them to Retired instead.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setAssetPendingDelete(null)} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={isMutatingWorkflow}
                  onClick={() => assetPendingDelete && void handleDeleteAsset(assetPendingDelete)}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 className="size-4" />
                  Delete asset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
          currentProfileId={access.profile.id}
          disabled={isMutatingWorkflow}
          profiles={data.profiles}
          messages={threadMessages}
          onBodyChange={setTicketBody}
          onCreateTicket={handleCreateGeneralTicket}
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
          lifecycleEvents={lifecycleEvents}
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
          assets={data.assets}
          categories={data.categories}
          categoryName={categoryName}
          disabled={isMutatingWorkflow}
          locationName={locationName}
          locations={data.locations}
          onCategoryNameChange={setCategoryName}
          onCreateCategory={handleCreateCategory}
          onCreateLocation={handleCreateLocation}
          onDelete={(kind, id) => void handleDeleteCatalogItem(kind, id)}
          onLocationNameChange={setLocationName}
          onRename={handleRenameCatalogItem}
        />
      ) : null}
    </AppShell>
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

  return adminSectionKeys.has(value as AdminSection) ? (value as AdminSection) : null;
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
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
