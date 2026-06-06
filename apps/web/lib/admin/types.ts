import type {
  AssetCondition,
  AssetStatus,
  ActivityLogRowDto,
  BookingStatus,
  BorrowingRowDto,
  DefectStatus,
  getDashboardCounters,
  Profile,
  PrintableReportRowDto,
  QuickLoginAccount,
  ReportType,
  UsageAnalyticsRowDto,
  UserRole
} from "@labtrack/shared";

export type AdminAccessState =
  | { status: "checking" }
  | { status: "missing-config" }
  | { status: "signed-out" }
  | { status: "forbidden"; profile: Profile }
  | { status: "error"; message: string }
  | { status: "authorized"; profile: Profile };

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: Profile["role"];
  department: string | null;
  is_active: boolean;
};

export type EmailDomainRule = {
  id: string;
  domain: string;
  is_allowed: boolean;
  notes: string | null;
  created_at: string;
};

export type RegistrationPolicy = {
  restrictSignupToAllowedDomains: boolean;
  allowedDomains: EmailDomainRule[];
};

export type CategoryRow = {
  id: string;
  name: string;
};

export type LocationRow = {
  id: string;
  name: string;
};

export type ActiveQrRow = {
  id: string;
  asset_id: string;
  code: string;
  generated_at: string;
};

export type BookingRow = {
  id: string;
  resource_type: "asset" | "room";
  asset_id: string | null;
  location_id: string | null;
  instructor_id: string;
  purpose: string;
  status: BookingStatus;
  requested_start_at: string;
  requested_end_at: string;
  decision_notes: string | null;
};

export type DefectRow = {
  id: string;
  asset_id: string;
  instructor_id: string;
  title: string;
  description: string;
  status: DefectStatus;
  resolution_notes: string | null;
  created_at: string;
};

export type TicketThreadRow = {
  id: string;
  subject_type: "booking" | "defect_report";
  booking_id: string | null;
  defect_report_id: string | null;
  created_at: string;
};

export type TicketMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type AssetView = {
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
  primaryImageUrl: string | null;
  activeQr: ActiveQrRow | null;
};

export type DashboardData = {
  categories: CategoryRow[];
  locations: LocationRow[];
  assets: AssetView[];
  bookings: BookingRow[];
  defects: DefectRow[];
  profiles: ProfileRow[];
  registrationPolicy: RegistrationPolicy;
  ticketThreads: TicketThreadRow[];
  counters: ReturnType<typeof getDashboardCounters>;
};

export type AssetFormState = {
  name: string;
  categoryId: string;
  locationId: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string;
  imageFile: File | null;
};

export type FormErrors = Partial<Record<keyof AssetFormState, string>>;

export type AdminDashboardProps = {
  initialAccess: AdminAccessState;
  initialData: DashboardData;
  quickLoginAccounts: QuickLoginAccount[];
};

export type ProfileAccessUpdates = Partial<Pick<ProfileRow, "role" | "is_active">>;
export type ProfileAccessRole = UserRole;

export type BorrowingMonitorRow = BorrowingRowDto;
export type UsageAnalyticsRow = UsageAnalyticsRowDto;
export type ActivityLogRow = ActivityLogRowDto;
export type PrintableReportRow = PrintableReportRowDto;

export type BorrowingMonitorFilters = {
  from: string;
  to: string;
  locationId?: string | null;
  resourceId?: string | null;
  statuses?: BookingStatus[] | null;
};

export type ReportFilters = {
  from: string;
  to: string;
  locationId?: string | null;
  assetId?: string | null;
};

export type PrintableReportFilters = ReportFilters & {
  reportType: ReportType;
};

export type ActivityLogFilters = {
  from?: string | null;
  to?: string | null;
  limit?: number;
  offset?: number;
};
