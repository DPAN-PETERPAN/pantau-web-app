import { getSession } from "@/lib/session";
import { AdminTokensClient } from "@/components/AdminTokensClient";

export default async function AdminTokensPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return <AdminTokensClient />;
}
