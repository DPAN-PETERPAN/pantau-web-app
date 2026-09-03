import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { currentPeriodLabel } from "@/lib/period";

const VALID_STATUS = ["ontrack", "behind", "alert", "notstarted", "done"];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "team") {
    return NextResponse.json({ error: "Hanya tim yang bisa menambah update." }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const { data: project } = await supabase.from("projects").select("id, team_id").eq("id", params.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
  if (project.team_id !== session.teamId) {
    return NextResponse.json({ error: "Tidak punya akses ke proyek ini." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const status = VALID_STATUS.includes(body.status) ? body.status : null;
  const progres = Array.isArray(body.progres) ? body.progres.filter((s: unknown) => typeof s === "string" && s.trim()) : [];
  const rencana = Array.isArray(body.rencana) ? body.rencana.filter((s: unknown) => typeof s === "string" && s.trim()) : [];

  if (!status) return NextResponse.json({ error: "Status proyek wajib dipilih." }, { status: 400 });
  if (progres.length === 0) return NextResponse.json({ error: "Isi minimal satu poin progres." }, { status: 400 });

  const { data: log, error } = await supabase
    .from("weekly_logs")
    .insert({
      project_id: params.id,
      period_label: currentPeriodLabel(),
      submitted_by: session.tokenId,
      status,
      progres,
      rencana,
      link_url: body.link_url?.trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("projects").update({ status }).eq("id", params.id);

  return NextResponse.json({ log });
}
