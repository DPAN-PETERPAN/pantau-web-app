"use client";

import { useEffect, useMemo, useState } from "react";
import { currentPeriodLabel } from "@/lib/period";
import { useCategories } from "@/lib/useCategories";
import type { ProjectSummary } from "@/lib/projects-query";
import { AppShell } from "./AppShell";
import { Badge, CatChip } from "./Badge";
import { ProjectDrawer } from "./ProjectDrawer";

type UpdateFilter = "all" | "updated" | "notupdated";

export function DashboardClient() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [updateFilter, setUpdateFilter] = useState<UpdateFilter>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const period = currentPeriodLabel();
  const { categories, byCode } = useCategories();

  function reloadProjects() {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []));
  }
  useEffect(reloadProjects, []);

  const openProjects = useMemo(() => projects.filter((p) => !p.closed_at), [projects]);
  const closedProjects = useMemo(() => projects.filter((p) => p.closed_at), [projects]);

  const total = projects.length;
  const avgPct = openProjects.length > 0 ? Math.round(openProjects.reduce((s, p) => s + (p.actual_pct ?? 0), 0) / openProjects.length) : 0;
  const behindOrAlert = openProjects.filter((p) => p.status === "behind" || p.status === "alert").length;
  const updated = useMemo(() => openProjects.filter((p) => p.last_log_period === period), [openProjects, period]);
  const notUpdated = useMemo(() => openProjects.filter((p) => p.last_log_period !== period), [openProjects, period]);

  const teamStats = useMemo(() => {
    const map = new Map<string, { team_id: string; team_name: string; total: number; notUpdated: number }>();
    for (const p of openProjects) {
      if (!map.has(p.team_id)) map.set(p.team_id, { team_id: p.team_id, team_name: p.team_name, total: 0, notUpdated: 0 });
      const s = map.get(p.team_id)!;
      s.total++;
      if (p.last_log_period !== period) s.notUpdated++;
    }
    return [...map.values()].sort((a, b) => b.notUpdated - a.notUpdated || a.team_name.localeCompare(b.team_name));
  }, [openProjects, period]);

  const filtered = (showClosed ? closedProjects : openProjects)
    .filter((p) => catFilter === "all" || p.category === catFilter)
    .filter((p) => teamFilter === "all" || p.team_id === teamFilter)
    .filter((p) => {
      if (showClosed) return true;
      if (updateFilter === "updated") return p.last_log_period === period;
      if (updateFilter === "notupdated") return p.last_log_period !== period;
      return true;
    });

  function toggleUpdateFilter(f: UpdateFilter) {
    setUpdateFilter((cur) => (cur === f ? "all" : f));
  }
  function toggleTeamFilter(teamId: string) {
    setTeamFilter((cur) => (cur === teamId ? "all" : teamId));
    setUpdateFilter((cur) => (cur === "all" ? "notupdated" : cur));
  }

  return (
    <AppShell
      role="admin"
      title="Dashboard Admin"
      subtitle="Pantauan progres seluruh grup — GPAN2"
      topbarRight={<div className="select">📅 {period}</div>}
    >
      <div className="kpi-row">
        <div className="card kpi">
          <div className="label">Total Proyek</div>
          <div className="value">{total}</div>
          <div className="foot">{closedProjects.length > 0 ? `termasuk ${closedProjects.length} ditutup` : "seluruh tim"}</div>
        </div>
        <div className="card kpi">
          <div className="label">Rata-rata Progres</div>
          <div className="value">{avgPct}%</div>
          <div className="foot">checklist · proyek aktif</div>
        </div>
        <div className={`card kpi ${behindOrAlert > 0 ? "warn" : ""}`}>
          <div className="label">Behind / Alert</div>
          <div className="value">{behindOrAlert}</div>
          <div className="foot">butuh perhatian</div>
        </div>
        <button
          type="button"
          className={`card kpi kpi-click ${updateFilter === "updated" && !showClosed ? "kpi-sel" : ""}`}
          onClick={() => {
            toggleUpdateFilter("updated");
            setShowClosed(false);
          }}
        >
          <div className="label">Sudah Update</div>
          <div className="value" style={{ color: "var(--green)" }}>
            {updated.length}
          </div>
          <div className="foot">{period} · klik untuk filter</div>
        </button>
        <button
          type="button"
          className={`card kpi kpi-click ${notUpdated.length > 0 ? "warn" : ""} ${updateFilter === "notupdated" && teamFilter === "all" && !showClosed ? "kpi-sel" : ""}`}
          onClick={() => {
            toggleUpdateFilter("notupdated");
            setTeamFilter("all");
            setShowClosed(false);
          }}
        >
          <div className="label">Belum Update</div>
          <div className="value">{notUpdated.length}</div>
          <div className="foot">{period} · klik untuk filter</div>
        </button>
        {closedProjects.length > 0 && (
          <button
            type="button"
            className={`card kpi kpi-click ${showClosed ? "kpi-sel" : ""}`}
            onClick={() => setShowClosed((v) => !v)}
          >
            <div className="label">Ditutup</div>
            <div className="value" style={{ color: "var(--teal)" }}>
              {closedProjects.length}
            </div>
            <div className="foot">klik untuk lihat</div>
          </button>
        )}
      </div>

      <div className="panel-desc" style={{ marginTop: -6 }}>
        Belum update per tim — klik untuk lihat proyek tim tersebut
      </div>
      <div className="kpi-row" style={{ marginBottom: 20 }}>
        {teamStats.map((t) => (
          <button
            key={t.team_id}
            type="button"
            className={`card kpi kpi-click ${t.notUpdated > 0 ? "warn" : ""} ${teamFilter === t.team_id && !showClosed ? "kpi-sel" : ""}`}
            onClick={() => {
              toggleTeamFilter(t.team_id);
              setShowClosed(false);
            }}
          >
            <div className="label">{t.team_name}</div>
            <div className="value">{t.notUpdated > 0 ? t.notUpdated : "✓"}</div>
            <div className="foot">
              {t.notUpdated > 0 ? `dari ${t.total} proyek belum update` : `${t.total} proyek — semua sudah update`}
            </div>
          </button>
        ))}
        {teamStats.length === 0 && <div className="empty-note">Belum ada data tim.</div>}
      </div>

      <div className="filter-row">
        <button className={`chip-filter ${catFilter === "all" ? "sel" : ""}`} onClick={() => setCatFilter("all")} type="button">
          Semua Kategori
        </button>
        {categories.map((c) => (
          <button key={c.code} className={`chip-filter ${catFilter === c.code ? "sel" : ""}`} onClick={() => setCatFilter(c.code)} type="button">
            Kategori {c.code} — {c.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: "6px 6px 4px" }}>
        <table className="proj-table">
          <thead>
            <tr>
              <th style={{ width: "34%" }}>Proyek</th>
              <th>Target</th>
              <th>Progres Checklist</th>
              <th>Status</th>
              <th>Update Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const fresh = p.last_log_period === period;
              const lastLabel = p.last_log_at ? new Date(p.last_log_at).toLocaleString("id-ID") : "Belum pernah";
              return (
                <tr key={p.id} onClick={() => setDrawerId(p.id)}>
                  <td>
                    <div className="proj-name-cell">
                      <CatChip category={byCode[p.category]} code={p.category} />
                      <div>
                        <div className="proj-name">
                          {p.name}
                          {p.closed_at && (
                            <span className="badge b-teal" style={{ marginLeft: 6 }}>
                              Ditutup
                            </span>
                          )}
                        </div>
                        <div className="proj-team">{p.team_name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: "12.5px", color: "var(--ink-soft)" }}>{p.target_label}</td>
                  <td>
                    <span className="mini-bar-track">
                      <span className="mini-bar-fill" style={{ width: `${p.actual_pct ?? 0}%` }} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{p.actual_pct ?? 0}%</span>
                  </td>
                  <td>
                    <Badge status={p.status} />
                  </td>
                  <td className={`updated-cell ${fresh ? "fresh" : "stale"}`}>{fresh ? lastLabel : "Belum diperbarui"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-note" style={{ padding: 16 }}>
                  Tidak ada proyek yang cocok dengan filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProjectDrawer projectId={drawerId} onClose={() => setDrawerId(null)} onChanged={reloadProjects} />
    </AppShell>
  );
}
