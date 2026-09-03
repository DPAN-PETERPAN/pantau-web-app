import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function POST(req: Request, { params }: { params: { phaseId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const dueLabel = typeof body.due_label === "string" ? body.due_label.trim() : "";
  if (!name) return NextResponse.json({ error: "Nama deliverable wajib diisi." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { count } = await supabase
    .from("checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("phase_id", params.phaseId);

  const { data: item, error } = await supabase
    .from("checklist_items")
    .insert({
      phase_id: params.phaseId,
      sort_order: count ?? 0,
      name,
      due_label: dueLabel || "Belum dijadwalkan",
      done: false,
      status: "notstarted",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item });
}
