import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Pinged by .github/workflows/keep-alive.yml every few days so the Supabase
// free-tier project doesn't auto-pause from inactivity. No auth required —
// it only reads a row count, nothing sensitive.
export async function GET() {
  const supabase = supabaseAdmin();
  const { count, error } = await supabase.from("teams").select("id", { count: "exact", head: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, teams: count, checkedAt: new Date().toISOString() });
}
