import { getSession } from "@/lib/session";
import { UpdateClient } from "@/components/UpdateClient";

export default async function UpdatePage() {
  const session = await getSession();
  if (!session || session.role !== "team") return null;
  return <UpdateClient teamId={session.teamId} teamName={session.teamName} />;
}
