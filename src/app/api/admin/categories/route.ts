import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

// Rotates through a fixed palette so the admin never has to pick a color —
// keeps "add a category" a one-field form (just the label).
const PALETTE = ["#4338CA", "#8B5CF6", "#0EA5E9", "#0D9488", "#EC4899", "#F59E0B", "#10B981", "#6366F1"];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Khusus admin." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: existing, error: listError } = await supabase.from("categories").select("code").order("sort_order");
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const usedCodes = new Set((existing ?? []).map((c) => c.code));
  let code = typeof body.code === "string" && body.code.trim() ? body.code.trim().toUpperCase().slice(0, 2) : "";
  if (!code || usedCodes.has(code)) {
    code = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((letter) => !usedCodes.has(letter)) ?? `X${usedCodes.size}`;
  }
  if (usedCodes.has(code)) {
    return NextResponse.json({ error: `Kode kategori "${code}" sudah dipakai.` }, { status: 400 });
  }

  const color = PALETTE[(existing?.length ?? 0) % PALETTE.length];
  const { data: category, error } = await supabase
    .from("categories")
    .insert({ code, label, color, sort_order: existing?.length ?? 0 })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ category });
}
