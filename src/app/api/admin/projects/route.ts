import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

const VALID_CATEGORY = ["A", "B", "C", "D"];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const teamId = typeof body.team_id === "string" ? body.team_id : "";
  const category = VALID_CATEGORY.includes(body.category) ? body.category : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const targetLabel = typeof body.target_label === "string" ? body.target_label.trim() : "";

  if (!teamId) return NextResponse.json({ error: "Pilih tim terlebih dahulu." }, { status: 400 });
  if (!category) return NextResponse.json({ error: "Pilih kategori proyek." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Nama proyek wajib diisi." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      team_id: teamId,
      category,
      name,
      target_label: targetLabel || "-",
      status: "notstarted",
      actual_pct: 0,
      plan_pct: null,
    })
    .select("*, teams(name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    project: { ...project, team_name: (project.teams as unknown as { name: string } | null)?.name ?? "" },
  });
}
