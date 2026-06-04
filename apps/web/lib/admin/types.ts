import type {
  AssetCondition,
  AssetStatus,
  BookingStatus,
  DefectStatus,
  getDashboardCounters,
  Profile,
  QuickLoginAccount,
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
  asset_id: string;
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
  activeQr: ActiveQrRow | null;
};

export type DashboardData = {
  categories: CategoryRow[];
  locations: LocationRow[];
  assets: AssetView[];
  bookings: BookingRow[];
  defects: DefectRow[];
  profiles: ProfileRow[];
  ticketThreads: TicketThreadRow[];
  counters: ReturnType<typeof getDashboardCounters>;
};

export type AssetFormState = {
  propertyNumber: string;
  serialNumber: string;
  name: string;
  categoryId: string;
  locationId: string;
  condition: AssetCondition;
  status: AssetStatus;
  notes: string;
};

export type FormErrors = Partial<Record<keyof AssetFormState, string>>;

export type AdminDashboardProps = {
  initialAccess: AdminAccessState;
  initialData: DashboardData;
  quickLoginAccounts: QuickLoginAccount[];
};

export type ProfileAccessUpdates = Partial<Pick<ProfileRow, "role" | "is_active">>;
export type ProfileAccessRole = UserRole;
