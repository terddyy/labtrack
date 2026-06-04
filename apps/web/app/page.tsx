import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminAccess, getAdminDashboardData, getEmptyDashboardData, getWebQuickLoginAccounts } from "@/lib/admin/services";

export default async function Home() {
  const access = await getAdminAccess();
  const data = access.status === "authorized" ? await getAdminDashboardData().catch(() => getEmptyDashboardData()) : getEmptyDashboardData();

  return <AdminDashboard initialAccess={access} initialData={data} quickLoginAccounts={getWebQuickLoginAccounts()} />;
}
