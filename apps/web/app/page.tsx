import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminAccess, getAdminDashboardData, getEmptyDashboardData, getWebQuickLoginAccounts } from "@/lib/admin/services";

// Per-user session page: never prerender (also avoids useSearchParams CSR bailout when env is absent at build).
export const dynamic = "force-dynamic";

export default async function Home() {
  const access = await getAdminAccess();
  const data = access.status === "authorized" ? await getAdminDashboardData().catch(() => getEmptyDashboardData()) : getEmptyDashboardData();

  return <AdminDashboard initialAccess={access} initialData={data} quickLoginAccounts={getWebQuickLoginAccounts()} />;
}
