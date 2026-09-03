import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*, teams(name)")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
  if (session.role === "team" && project.team_id !== session.teamId) {
    return NextResponse.json({ error: "Tidak punya akses ke proyek ini." }, { status: 403 });
  }

  const { data: phases } = await supabase
    .from("checklist_phases")
    .select("*, checklist_items(*)")
    .eq("project_id", params.id)
    .order("sort_order");

  const { data: logs } = await supabase
    .from("weekly_logs")
    .select("*")
    .eq("project_id", params.id)
    .order("submitted_at", { ascending: false });

  const checklist = (phases ?? []).map((phase) => ({
    ...phase,
    items: (phase.checklist_items ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
  }));

  return NextResponse.json({
    project: {
      ...project,
      team_name: (project.teams as unknown as { name: string } | null)?.name ?? "",
      checklist,
      logs: logs ?? [],
    },
    readOnly: session.role !== "team",
  });
}
