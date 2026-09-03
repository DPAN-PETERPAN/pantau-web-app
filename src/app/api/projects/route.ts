import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { getProjectSummaries } from "@/lib/projects-query";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  const supabase = supabaseAdmin();
  try {
    const projects = await getProjectSummaries(
      supabase,
      session.role === "team" ? { teamId: session.teamId } : {}
    );
    return NextResponse.json({ projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat data proyek.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
