import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const supabase = supabaseAdmin();
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("team_id", params.id);
  if (count && count > 0) {
    return NextResponse.json({ error: "Tim masih punya proyek. Hapus/pindahkan proyeknya dulu." }, { status: 400 });
  }

  const { error } = await supabase.from("teams").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
