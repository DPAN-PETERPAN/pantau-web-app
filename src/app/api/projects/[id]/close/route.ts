import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

// Explicit, reversible close/reopen — not tied to checklist completion.
// A team closes its own project; an admin can close/reopen any project too
// (e.g. to fix a team's mistake without waiting on them).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const supabase = supabaseAdmin();
  const { data: project } = await supabase.from("projects").select("id, team_id").eq("id", params.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
  if (session.role === "team" && project.team_id !== session.teamId) {
    return NextResponse.json({ error: "Tidak punya akses ke proyek ini." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const closed = Boolean(body.closed);

  const { error } = await supabase
    .from("projects")
    .update({ closed_at: closed ? new Date().toISOString() : null })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, closed });
}
