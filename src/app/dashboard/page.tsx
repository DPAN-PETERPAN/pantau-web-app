import { getSession } from "@/lib/session";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return <DashboardClient />;
}
