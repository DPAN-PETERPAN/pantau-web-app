import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

// Cascades to checklist_phases, checklist_items and weekly_logs (FK ON DELETE
// CASCADE, see supabase/migrations/0001_init.sql) — deletes a project's whole
// history. The confirmation step lives client-side (AdminProjectsClient).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("projects").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
