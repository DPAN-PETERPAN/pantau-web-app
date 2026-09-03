import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { generateCode, hashCode, slugifyTeam } from "@/lib/tokens";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data: tokens, error } = await supabase
    .from("access_tokens")
    .select("id, label, active, created_at, last_used_at, team_id, teams(name)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (tokens ?? []).map((t) => ({
    id: t.id,
    label: t.label,
    active: t.active,
    created_at: t.created_at,
    last_used_at: t.last_used_at,
    team_id: t.team_id,
    team_name: (t.teams as unknown as { name: string } | null)?.name ?? "",
  }));

  return NextResponse.json({ tokens: shaped });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const teamId = typeof body.team_id === "string" ? body.team_id : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!teamId) return NextResponse.json({ error: "Pilih tim terlebih dahulu." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: team } = await supabase.from("teams").select("id, name").eq("id", teamId).maybeSingle();
  if (!team) return NextResponse.json({ error: "Tim tidak ditemukan." }, { status: 404 });

  const code = generateCode(slugifyTeam(team.name));
  const { data: inserted, error } = await supabase
    .from("access_tokens")
    .insert({ team_id: teamId, code_hash: hashCode(code), label: label || `Kode untuk ${team.name}` })
    .select("id, label, active, created_at, team_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ token: { ...inserted, team_name: team.name }, code });
}
