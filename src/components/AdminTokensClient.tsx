"use client";

import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";

interface Team {
  id: string;
  name: string;
}
interface TokenRow {
  id: string;
  label: string;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
  team_id: string;
  team_name: string;
}

export function AdminTokensClient() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [teamId, setTeamId] = useState("");
  const [label, setLabel] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reload() {
    fetch("/api/admin/tokens")
      .then((r) => r.json())
      .then((data) => setTokens(data.tokens ?? []));
  }

  useEffect(() => {
    fetch("/api/admin/teams")
      .then((r) => r.json())
      .then((data) => {
        setTeams(data.teams ?? []);
        if (data.teams?.length) setTeamId(data.teams[0].id);
      });
    reload();
  }, []);

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, label }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat kode.");
      return;
    }
    setNewCode(data.code);
    setLabel("");
    reload();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/tokens/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    reload();
  }

  async function regenerate(id: string) {
    const res = await fetch(`/api/admin/tokens/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true }),
    });
    const data = await res.json();
    if (res.ok) setNewCode(data.code);
    reload();
  }

  return (
    <AppShell role="admin" title="Kelola Kode Akses" subtitle="Buat &amp; cabut kode masuk untuk tiap tim">
      {newCode && (
        <div className="new-code-banner">
          Kode baru dibuat: <code>{newCode}</code> — catat &amp; bagikan sekarang, kode ini tidak ditampilkan lagi.
          <button className="ghost-btn" style={{ marginLeft: "auto" }} onClick={() => setNewCode(null)} type="button">
            Tutup
          </button>
        </div>
      )}

      <div className="card panel">
        <div className="panel-head">
          <div className="panel-title">Buat Kode Akses Baru</div>
        </div>
        <div className="panel-desc">Kode ini yang dibagikan ke tim untuk login di halaman Update Mingguan.</div>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={createToken}>
          <div className="form-row2">
            <div className="form-field">
              <label>Tim</label>
              <select className="form-input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>
                Catatan <span className="opt">opsional</span>
              </label>
              <input className="form-input" placeholder="cth. Dibagikan 3 Sep 2026" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>
          <button className="save-btn" type="submit" disabled={busy || !teamId}>
            + Buat Kode
          </button>
        </form>
      </div>

      <div className="card panel">
        <div className="panel-head">
          <div className="panel-title">Kode Aktif &amp; Riwayat</div>
        </div>
        {tokens.length === 0 ? (
          <div className="empty-note">Belum ada kode dibuat.</div>
        ) : (
          tokens.map((t) => (
            <div className="token-row" key={t.id}>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.team_name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{t.label}</div>
              </div>
              <span className={`badge ${t.active ? "b-green" : "b-gray"}`}>{t.active ? "Aktif" : "Dicabut"}</span>
              <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                Dibuat {new Date(t.created_at).toLocaleDateString("id-ID")}
                {t.last_used_at && <> · Terakhir dipakai {new Date(t.last_used_at).toLocaleDateString("id-ID")}</>}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button className="ghost-btn" type="button" onClick={() => regenerate(t.id)}>
                  Buat Ulang
                </button>
                {t.active ? (
                  <button className="ghost-btn" type="button" onClick={() => toggleActive(t.id, false)}>
                    Cabut
                  </button>
                ) : (
                  <button className="ghost-btn" type="button" onClick={() => toggleActive(t.id, true)}>
                    Aktifkan
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="info-callout">
        ⓘ Untuk mengubah daftar proyek, tim, atau struktur checklist, gunakan Table Editor di Supabase Studio langsung — lihat CLAUDE.md.
      </div>
    </AppShell>
  );
}
