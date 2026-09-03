import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) return NextResponse.json({ error: "Nama tahap wajib diisi." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { count } = await supabase
    .from("checklist_phases")
    .select("id", { count: "exact", head: true })
    .eq("project_id", params.id);

  const { data: phase, error } = await supabase
    .from("checklist_phases")
    .insert({ project_id: params.id, label, sort_order: count ?? 0 })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ phase: { ...phase, items: [] } });
}
