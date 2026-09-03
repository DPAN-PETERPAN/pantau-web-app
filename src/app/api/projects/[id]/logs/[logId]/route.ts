import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string; logId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "team") {
    return NextResponse.json({ error: "Hanya tim yang bisa mengubah update." }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { data: project } = await supabase.from("projects").select("id, team_id").eq("id", params.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
  if (project.team_id !== session.teamId) {
    return NextResponse.json({ error: "Tidak punya akses ke proyek ini." }, { status: 403 });
  }

  const { data: log } = await supabase.from("weekly_logs").select("id, project_id").eq("id", params.logId).maybeSingle();
  if (!log || log.project_id !== params.id) {
    return NextResponse.json({ error: "Entri log tidak ditemukan." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const progres = Array.isArray(body.progres) ? body.progres.filter((s: unknown) => typeof s === "string" && s.trim()) : [];
  const rencana = Array.isArray(body.rencana) ? body.rencana.filter((s: unknown) => typeof s === "string" && s.trim()) : [];
  if (progres.length === 0) return NextResponse.json({ error: "Progres tidak boleh kosong." }, { status: 400 });

  const { error } = await supabase
    .from("weekly_logs")
    .update({ progres, rencana, link_url: body.link_url?.trim() || null, edited_at: new Date().toISOString() })
    .eq("id", params.logId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
