import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string; itemId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "team") {
    return NextResponse.json({ error: "Hanya tim yang bisa mengubah checklist." }, { status: 403 });
  }

  const supabase = supabaseAdmin();

  const { data: project } = await supabase
    .from("projects")
    .select("id, team_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
  if (project.team_id !== session.teamId) {
    return NextResponse.json({ error: "Tidak punya akses ke proyek ini." }, { status: 403 });
  }

  const { data: item } = await supabase
    .from("checklist_items")
    .select("id, phase_id, checklist_phases(project_id)")
    .eq("id", params.itemId)
    .maybeSingle();
  const itemProjectId = (item?.checklist_phases as unknown as { project_id: string } | null)?.project_id;
  if (!item || itemProjectId !== params.id) {
    return NextResponse.json({ error: "Item checklist tidak ditemukan." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const done = Boolean(body.done);

  let update: Record<string, unknown>;
  if (done) {
    if (!body.doc_date) {
      return NextResponse.json({ error: "Tanggal terbit/disetujui wajib diisi." }, { status: 400 });
    }
    update = {
      done: true,
      status: "ontrack",
      doc_date: body.doc_date,
      doc_number: body.doc_number?.trim() || null,
      vendor: body.vendor?.trim() || null,
      contract_value: body.contract_value?.trim() || null,
      doc_link: body.doc_link?.trim() || null,
      notes: body.notes?.trim() || null,
      updated_by: session.tokenId,
      updated_at: new Date().toISOString(),
    };
  } else {
    update = { done: false, updated_by: session.tokenId, updated_at: new Date().toISOString() };
  }

  const { error: updateError } = await supabase.from("checklist_items").update(update).eq("id", params.itemId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Recompute the project's denormalized completion percentage.
  const { data: allItems } = await supabase
    .from("checklist_items")
    .select("id, done, checklist_phases!inner(project_id)")
    .eq("checklist_phases.project_id", params.id);
  const total = allItems?.length ?? 0;
  const doneCount = allItems?.filter((i) => i.done).length ?? 0;
  const actualPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  await supabase.from("projects").update({ actual_pct: actualPct }).eq("id", params.id);

  return NextResponse.json({ ok: true, actual_pct: actualPct });
}
