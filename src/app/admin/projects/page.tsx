import { getSession } from "@/lib/session";
import { AdminProjectsClient } from "@/components/AdminProjectsClient";

export default async function AdminProjectsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return <AdminProjectsClient />;
}
