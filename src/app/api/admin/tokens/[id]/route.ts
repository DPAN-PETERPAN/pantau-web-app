import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { generateCode, hashCode, slugifyTeam } from "@/lib/tokens";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const supabase = supabaseAdmin();
  const { data: existing } = await supabase
    .from("access_tokens")
    .select("id, team_id, teams(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Kode tidak ditemukan." }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  if (body.regenerate) {
    const teamName = (existing.teams as unknown as { name: string } | null)?.name ?? "TIM";
    const code = generateCode(slugifyTeam(teamName));
    const { error } = await supabase
      .from("access_tokens")
      .update({ code_hash: hashCode(code), active: true })
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, code });
  }

  if (typeof body.active === "boolean") {
    const { error } = await supabase.from("access_tokens").update({ active: body.active }).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tidak ada perubahan yang diminta." }, { status: 400 });
}
