"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectDetail } from "@/lib/types";
import { useCategories } from "@/lib/useCategories";
import { Badge, CatChip } from "./Badge";
import { ChecklistPanel } from "./ChecklistPanel";
import { LogList } from "./LogList";

export function ProjectDrawer({
  projectId,
  onClose,
  onChanged,
}: {
  projectId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const { byCode } = useCategories();

  const reload = useCallback((id: string) => {
    setLoading(true);
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => setProject(data.project ?? null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setProject(null);
    reload(projectId);
  }, [projectId, reload]);

  if (!projectId) return null;

  const planPct = project?.plan_pct != null ? Math.min(project.plan_pct, 100) : null;
  const actPct = project?.actual_pct != null ? Math.min(project.actual_pct, 100) : null;

  async function toggleClose() {
    if (!project) return;
    const closing = !project.closed_at;
    if (closing && !window.confirm("Tutup proyek ini dari daftar update mingguan tim? Bisa dibuka kembali kapan saja.")) return;
    const res = await fetch(`/api/projects/${project.id}/close`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closed: closing }),
    });
    if (res.ok) {
      reload(project.id);
      onChanged?.();
    }
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer">
        {loading || !project ? (
          <div style={{ padding: 22 }}>Memuat...</div>
        ) : (
          <>
            <div className="drawer-head">
              <button className="drawer-close" onClick={onClose} type="button">
                ×
              </button>
              <div className="drawer-cat">
                <CatChip category={byCode[project.category]} code={project.category} />
                <span style={{ fontSize: "11.5px", color: "var(--ink-faint)" }}>
                  {byCode[project.category]?.label ?? project.category} · {project.team_name}
                </span>
                {project.closed_at && (
                  <span className="badge b-teal" style={{ marginLeft: "auto" }}>
                    Ditutup
                  </span>
                )}
              </div>
              <div className="drawer-title">{project.name}</div>
              <div className="drawer-sub" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                Target: {project.target_label} &nbsp;·&nbsp; <Badge status={project.status} />
                <button className="ghost-btn" type="button" style={{ marginLeft: "auto" }} onClick={toggleClose}>
                  {project.closed_at ? "↺ Buka Kembali" : "Tutup Proyek"}
                </button>
              </div>
            </div>
            <div className="drawer-body">
              {planPct != null && (
                <>
                  <div className="drawer-section-title">Kurva Progres (Rencana vs Realisasi)</div>
                  <div className="timeline-bar-wrap">
                    <div className="timeline-labels">
                      <span>Rencana {project.plan_pct}%</span>
                      <span>Realisasi {project.actual_pct}%</span>
                    </div>
                    <div className="timeline-track">
                      <div className="timeline-plan" style={{ width: `${planPct}%` }} />
                      <div className="timeline-actual" style={{ width: `${actPct ?? 0}%` }} />
                    </div>
                    <div className="timeline-legend">
                      <span>
                        <i style={{ background: "var(--blue-soft)", border: "1px solid var(--blue)" }} />
                        Rencana
                      </span>
                      <span>
                        <i style={{ background: "var(--navy-800)" }} />
                        Realisasi
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="drawer-section-title">Checklist Deliverable</div>
              <div className="drawer-checklist">
                <ChecklistPanel phases={project.checklist} readOnly />
              </div>

              <div className="drawer-section-title">Riwayat Update Mingguan</div>
              <LogList logs={project.logs} teamName={project.team_name} editable={false} />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
