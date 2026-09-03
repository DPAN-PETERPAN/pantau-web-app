import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data: teams, error } = await supabase.from("teams").select("id, name, projects(count)").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (teams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    project_count: (t.projects as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
  return NextResponse.json({ teams: shaped });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Nama tim wajib diisi." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: team, error } = await supabase.from("teams").insert({ name }).select("id, name").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ team: { ...team, project_count: 0 } });
}
