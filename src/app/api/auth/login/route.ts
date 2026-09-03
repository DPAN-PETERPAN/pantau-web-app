import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { encodeSession, newExpiry, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { hashCode } from "@/lib/tokens";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Kode tidak boleh kosong." }, { status: 400 });
  }

  if (process.env.ADMIN_CODE && code === process.env.ADMIN_CODE) {
    const res = NextResponse.json({ role: "admin" });
    res.cookies.set(SESSION_COOKIE, await encodeSession({ role: "admin", exp: newExpiry() }), sessionCookieOptions());
    return res;
  }

  const supabase = supabaseAdmin();
  const { data: token } = await supabase
    .from("access_tokens")
    .select("id, team_id, active, teams(name)")
    .eq("code_hash", hashCode(code))
    .maybeSingle();

  if (!token || !token.active) {
    return NextResponse.json({ error: "Kode tidak valid atau sudah tidak aktif." }, { status: 401 });
  }

  const teamName = (token.teams as unknown as { name: string } | null)?.name ?? "Tim";

  await supabase.from("access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", token.id);

  const res = NextResponse.json({ role: "team", teamName });
  res.cookies.set(
    SESSION_COOKIE,
    await encodeSession({ role: "team", teamId: token.team_id, teamName, tokenId: token.id, exp: newExpiry() }),
    sessionCookieOptions()
  );
  return res;
}
