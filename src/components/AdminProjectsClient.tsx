"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategoryDef, ProjectDetail } from "@/lib/types";
import { useCategories } from "@/lib/useCategories";
import type { ProjectSummary } from "@/lib/projects-query";
import { AppShell } from "./AppShell";
import { CatChip, ChecklistStatusBadge } from "./Badge";

interface Team {
  id: string;
  name: string;
  project_count: number;
}

export function AdminProjectsClient() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState("");
  const { categories, byCode, reload: reloadCategories } = useCategories();

  function reloadTeams() {
    fetch("/api/admin/teams")
      .then((r) => r.json())
      .then((data) => setTeams(data.teams ?? []));
  }
  function reloadProjects() {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []));
  }
  function reloadDetail(id: string) {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => setDetail(data.project ?? null));
  }

  useEffect(() => {
    reloadTeams();
    reloadProjects();
  }, []);

  useEffect(() => {
    if (selectedId) reloadDetail(selectedId);
    else setDetail(null);
  }, [selectedId]);

  return (
    <AppShell role="admin" title="Kelola Proyek &amp; Tim" subtitle="Tambah tim, proyek, dan susun checklist deliverable-nya">
      {error && <div className="form-error">{error}</div>}

      <div className="team-grid">
        <div>
          <ProjectSection
            teams={teams}
            projects={projects}
            categories={categories}
            byCode={byCode}
            onCategoryAdded={reloadCategories}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onError={setError}
            onProjectCreated={(p) => {
              reloadProjects();
              setSelectedId(p.id);
            }}
            onProjectDeleted={() => {
              reloadProjects();
              setSelectedId(null);
            }}
          />
        </div>
        <div>
          <TeamSection teams={teams} onError={setError} onChanged={reloadTeams} />
        </div>
      </div>

      {selectedId && (
        <div className="card panel" style={{ marginTop: 18 }}>
          <div className="panel-head">
            <div className="panel-title">Checklist Deliverable{detail ? ` — ${detail.name}` : ""}</div>
          </div>
          {!detail ? (
            <div className="empty-note">Memuat...</div>
          ) : (
            <ChecklistBuilder project={detail} onChanged={() => reloadDetail(selectedId)} onError={setError} />
          )}
        </div>
      )}
    </AppShell>
  );
}

function TeamSection({ teams, onError, onChanged }: { teams: Team[]; onError: (e: string) => void; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return onError(data.error ?? "Gagal menambah tim.");
    setName("");
    onChanged();
  }

  async function removeTeam(id: string) {
    if (!window.confirm("Hapus tim ini?")) return;
    const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return onError(data.error ?? "Gagal menghapus tim.");
    onChanged();
  }

  return (
    <div className="card panel">
      <div className="panel-head">
        <div className="panel-title">Tim</div>
      </div>
      <div className="panel-desc">Setiap tim login pakai satu kode bersama — buat kodenya di Kelola Kode Akses setelah tim dibuat.</div>
      <form onSubmit={addTeam} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="form-input" placeholder="Nama tim, cth. GPAN2" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="save-btn" type="submit" disabled={busy}>
          + Tambah
        </button>
      </form>
      {teams.map((t) => (
        <div className="token-row" key={t.id}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{t.project_count} proyek</div>
          <button
            className="ghost-btn"
            type="button"
            style={{ marginLeft: "auto" }}
            disabled={t.project_count > 0}
            title={t.project_count > 0 ? "Tim masih punya proyek" : "Hapus tim"}
            onClick={() => removeTeam(t.id)}
          >
            Hapus
          </button>
        </div>
      ))}
    </div>
  );
}

function ProjectSection({
  teams,
  projects,
  categories,
  byCode,
  onCategoryAdded,
  selectedId,
  onSelect,
  onError,
  onProjectCreated,
  onProjectDeleted,
}: {
  teams: Team[];
  projects: ProjectSummary[];
  categories: CategoryDef[];
  byCode: Record<string, CategoryDef>;
  onCategoryAdded: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onError: (e: string) => void;
  onProjectCreated: (p: { id: string }) => void;
  onProjectDeleted: () => void;
}) {
  const [teamId, setTeamId] = useState("");
  const [category, setCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [name, setName] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!teamId && teams.length) setTeamId(teams[0].id);
  }, [teams, teamId]);
  useEffect(() => {
    if (!category && categories.length) setCategory(categories[0].code);
  }, [categories, category]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newCategoryLabel.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return onError(data.error ?? "Gagal menambah kategori.");
    setNewCategoryLabel("");
    setAddingCategory(false);
    setCategory(data.category.code);
    onCategoryAdded();
  }

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !category || !name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, category, name: name.trim(), target_label: targetLabel.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return onError(data.error ?? "Gagal menambah proyek.");
    setName("");
    setTargetLabel("");
    onProjectCreated(data.project);
  }

  async function removeProject(id: string, projectName: string) {
    if (!window.confirm(`Hapus proyek "${projectName}"? Seluruh checklist dan riwayat update mingguannya ikut terhapus.`)) return;
    const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return onError(data.error ?? "Gagal menghapus proyek.");
    onProjectDeleted();
  }

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return projects.filter((p) => p.name.toLowerCase().includes(q) || p.team_name.toLowerCase().includes(q)).slice(0, 8);
  }, [projects, query]);

  return (
    <div className="card panel">
      <div className="panel-head">
        <div className="panel-title">Proyek</div>
      </div>
      <div className="panel-desc">Setelah dibuat, cari proyeknya di bawah untuk menyusun checklist deliverable-nya.</div>

      <form onSubmit={addProject}>
        <div className="form-row2">
          <div className="form-field">
            <label>Tim</label>
            <select className="form-input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.length === 0 && <option value="">Belum ada tim</option>}
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Kategori</label>
            {addingCategory ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="form-input"
                  placeholder="Nama kategori baru"
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  autoFocus
                />
                <button className="ghost-btn" type="button" onClick={addCategory} disabled={busy}>
                  Simpan
                </button>
                <button className="ghost-btn" type="button" onClick={() => setAddingCategory(false)}>
                  ×
                </button>
              </div>
            ) : (
              <select
                className="form-input"
                value={category}
                onChange={(e) => {
                  if (e.target.value === "__new__") setAddingCategory(true);
                  else setCategory(e.target.value);
                }}
              >
                {categories.length === 0 && <option value="">Belum ada kategori</option>}
                {categories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </option>
                ))}
                <option value="__new__">+ Kategori baru...</option>
              </select>
            )}
          </div>
        </div>
        <div className="form-field">
          <label>Nama Proyek</label>
          <input className="form-input" placeholder="cth. Renovasi KPwBI Bengkulu" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label>
            Target <span className="opt">opsional, cth. &ldquo;BAST-1&rdquo;</span>
          </label>
          <input className="form-input" value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} />
        </div>
        <button className="save-btn" type="submit" disabled={busy || !teamId || !category}>
          + Tambah Proyek
        </button>
      </form>

      <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div className="field-label">Cari &amp; kelola proyek</div>
        <div className="combobox">
          <input
            className="form-input"
            placeholder="Ketik nama proyek atau tim..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSelect("");
            }}
          />
          {matches.length > 0 && (
            <div className="combobox-list">
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="deliv-row"
                  onClick={() => {
                    onSelect(p.id);
                    setQuery("");
                  }}
                >
                  <CatChip category={byCode[p.category]} code={p.category} />
                  <div className="deliv-main">
                    <div className="deliv-name">{p.name}</div>
                    <div className="deliv-date">{p.team_name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="deliv-row" style={{ marginTop: 10, background: "var(--paper)", borderRadius: 8 }}>
            <CatChip category={byCode[selected.category]} code={selected.category} />
            <div className="deliv-main">
              <div className="deliv-name">{selected.name}</div>
              <div className="deliv-date">{selected.team_name}</div>
            </div>
            <button className="btn-danger-text" type="button" onClick={() => removeProject(selected.id, selected.name)}>
              Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistBuilder({ project, onChanged, onError }: { project: ProjectDetail; onChanged: () => void; onError: (e: string) => void }) {
  const [phaseLabel, setPhaseLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function addPhase(e: React.FormEvent) {
    e.preventDefault();
    if (!phaseLabel.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/admin/projects/${project.id}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: phaseLabel.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return onError(data.error ?? "Gagal menambah tahap.");
    setPhaseLabel("");
    onChanged();
  }

  async function removePhase(id: string) {
    if (!window.confirm("Hapus tahap ini beserta seluruh item di dalamnya?")) return;
    const res = await fetch(`/api/admin/phases/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return onError(data.error ?? "Gagal menghapus tahap.");
    onChanged();
  }

  return (
    <>
      {project.checklist.map((phase) => (
        <div className="phase-block" key={phase.id}>
          <div className="phase-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {phase.label}
            <button className="btn-danger-text" type="button" style={{ padding: "0 4px" }} onClick={() => removePhase(phase.id)}>
              Hapus Tahap
            </button>
          </div>
          {phase.items.map((item) => (
            <div className="deliv-row" key={item.id} style={{ cursor: "default" }}>
              <div className="deliv-main">
                <div className="deliv-name">{item.name}</div>
                <div className="deliv-date">{item.due_label}</div>
              </div>
              <ChecklistStatusBadge done={item.done} status={item.status} />
              <button
                className="btn-danger-text"
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Hapus item "${item.name}"?`)) return;
                  const res = await fetch(`/api/admin/items/${item.id}`, { method: "DELETE" });
                  const data = await res.json();
                  if (!res.ok) return onError(data.error ?? "Gagal menghapus item.");
                  onChanged();
                }}
              >
                ×
              </button>
            </div>
          ))}
          <AddItemForm phaseId={phase.id} onAdded={onChanged} onError={onError} />
        </div>
      ))}

      <form onSubmit={addPhase} style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <input
          className="form-input"
          placeholder="Nama tahap baru, cth. Implementasi"
          value={phaseLabel}
          onChange={(e) => setPhaseLabel(e.target.value)}
        />
        <button className="save-btn" type="submit" disabled={busy}>
          + Tambah Tahap
        </button>
      </form>
    </>
  );
}

function AddItemForm({ phaseId, onAdded, onError }: { phaseId: string; onAdded: () => void; onError: (e: string) => void }) {
  const [name, setName] = useState("");
  const [dueLabel, setDueLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/admin/phases/${phaseId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), due_label: dueLabel.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return onError(data.error ?? "Gagal menambah item.");
    setName("");
    setDueLabel("");
    onAdded();
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 6, padding: "6px 4px", flexWrap: "wrap" }}>
      <input className="form-input" style={{ flex: 2 }} placeholder="Nama deliverable, cth. BAST 1" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className="form-input"
        style={{ flex: 1 }}
        placeholder="Target, cth. 30 Apr 2026"
        value={dueLabel}
        onChange={(e) => setDueLabel(e.target.value)}
      />
      <button className="ghost-btn" type="submit" disabled={busy}>
        + Item
      </button>
    </form>
  );
}
