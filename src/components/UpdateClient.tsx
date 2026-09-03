"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { ChecklistItem, ProjectDetail } from "@/lib/types";
import { currentPeriodLabel } from "@/lib/period";
import { useCategories } from "@/lib/useCategories";
import { AppShell } from "./AppShell";
import { CatChip } from "./Badge";
import { ChecklistPanel } from "./ChecklistPanel";
import { ChecklistModal } from "./ChecklistModal";
import { ComposeCard } from "./ComposeCard";
import { LogList } from "./LogList";

interface ProjectTab {
  id: string;
  name: string;
  category: string;
  actual_pct: number | null;
  last_log_period: string | null;
  closed_at: string | null;
}

type PickFilter = "all" | "updated" | "notupdated";

export function UpdateClient({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [projects, setProjects] = useState<ProjectTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [modalItem, setModalItem] = useState<ChecklistItem | null>(null);
  const [pickFilter, setPickFilter] = useState<PickFilter>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [error, setError] = useState("");
  const period = currentPeriodLabel();
  const { byCode } = useCategories();

  function reloadProjects() {
    return fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        const list: ProjectTab[] = data.projects ?? [];
        setProjects(list);
        return list;
      });
  }

  useEffect(() => {
    reloadProjects().then((list) => {
      const firstOpen = list.find((p) => !p.closed_at) ?? list[0];
      if (firstOpen) setActiveId(firstOpen.id);
    });
  }, []);

  // Ditutup = a deliberate, reversible action (see toggleClose) — not inferred from checklist %,
  // since a 100%-done checklist can still have something worth writing in a weekly update.
  const openProjects = useMemo(() => projects.filter((p) => !p.closed_at), [projects]);
  const closedProjects = useMemo(() => projects.filter((p) => p.closed_at), [projects]);

  const updatedProjects = useMemo(() => openProjects.filter((p) => p.last_log_period === period), [openProjects, period]);
  const notUpdatedProjects = useMemo(() => openProjects.filter((p) => p.last_log_period !== period), [openProjects, period]);

  // Belum-update projects first, so the team works through what's left instead of starting over each time.
  const orderedOpen = useMemo(
    () => [...openProjects].sort((a, b) => Number(a.last_log_period === period) - Number(b.last_log_period === period)),
    [openProjects, period]
  );
  const visibleProjects = orderedOpen.filter((p) => {
    if (pickFilter === "updated") return p.last_log_period === period;
    if (pickFilter === "notupdated") return p.last_log_period !== period;
    return true;
  });

  function togglePickFilter(f: PickFilter) {
    setPickFilter((cur) => (cur === f ? "all" : f));
  }

  const loadDetail = useCallback((id: string) => {
    setLoadingDetail(true);
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => setDetail(data.project ?? null))
      .finally(() => setLoadingDetail(false));
  }, []);

  useEffect(() => {
    if (activeId) loadDetail(activeId);
  }, [activeId, loadDetail]);

  if (projects.length === 0) {
    return (
      <AppShell role="team" teamName={teamName} title="Update Mingguan" subtitle="Isi progres & checklist deliverable proyek Anda">
        <div className="empty-note">Tim ini belum memiliki proyek terdaftar. Hubungi admin.</div>
      </AppShell>
    );
  }

  async function toggleClose() {
    if (!activeId || !detail) return;
    const closing = !detail.closed_at;
    if (closing && !window.confirm("Tutup proyek ini dari daftar update mingguan? Anda bisa membukanya kembali kapan saja.")) return;
    const res = await fetch(`/api/projects/${activeId}/close`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closed: closing }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Gagal mengubah status proyek.");
    loadDetail(activeId);
    reloadProjects();
  }

  async function submitNewEntry(payload: { status: string; progres: string[]; rencana: string[]; link_url: string }) {
    const res = await fetch(`/api/projects/${activeId}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Gagal menyimpan.";
    setComposeOpen(false);
    if (activeId) loadDetail(activeId);
  }

  async function saveEditEntry(logId: string, payload: { progres: string[]; rencana: string[]; link_url: string }) {
    const res = await fetch(`/api/projects/${activeId}/logs/${logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Gagal menyimpan.";
    if (activeId) loadDetail(activeId);
  }

  async function saveChecklistItem(payload: {
    doc_date: string;
    doc_number: string;
    vendor: string;
    contract_value: string;
    doc_link: string;
    notes: string;
  }) {
    if (!activeId || !modalItem) return;
    const res = await fetch(`/api/projects/${activeId}/checklist/${modalItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Gagal menyimpan.";
    setModalItem(null);
    loadDetail(activeId);
    reloadProjects();
  }

  async function unmarkChecklistItem() {
    if (!activeId || !modalItem) return;
    await fetch(`/api/projects/${activeId}/checklist/${modalItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: false }),
    });
    setModalItem(null);
    loadDetail(activeId);
    reloadProjects();
  }

  return (
    <AppShell
      role="team"
      teamName={teamName}
      title="Update Mingguan"
      subtitle="Isi progres & checklist deliverable proyek Anda"
      topbarRight={<div className="select">📅 {period}</div>}
    >
      {error && <div className="form-error">{error}</div>}

      <div className="kpi-row" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`card kpi kpi-click ${pickFilter === "updated" ? "kpi-sel" : ""}`}
          onClick={() => togglePickFilter("updated")}
        >
          <div className="label">Sudah Update</div>
          <div className="value" style={{ color: "var(--green)" }}>
            {updatedProjects.length}
          </div>
          <div className="foot">{period} · klik untuk filter</div>
        </button>
        <button
          type="button"
          className={`card kpi kpi-click ${notUpdatedProjects.length > 0 ? "warn" : ""} ${pickFilter === "notupdated" ? "kpi-sel" : ""}`}
          onClick={() => togglePickFilter("notupdated")}
        >
          <div className="label">Belum Update</div>
          <div className="value">{notUpdatedProjects.length}</div>
          <div className="foot">{period} · klik untuk filter</div>
        </button>
        {closedProjects.length > 0 && (
          <button type="button" className={`card kpi kpi-click ${showClosed ? "kpi-sel" : ""}`} onClick={() => setShowClosed((v) => !v)}>
            <div className="label">Ditutup</div>
            <div className="value" style={{ color: "var(--teal)" }}>
              {closedProjects.length}
            </div>
            <div className="foot">{showClosed ? "sembunyikan" : "tampilkan"}</div>
          </button>
        )}
      </div>

      <div className="project-pick-grid">
        {visibleProjects.map((p) => (
          <ProjectPickCard
            key={p.id}
            project={p}
            selected={p.id === activeId}
            updated={p.last_log_period === period}
            category={byCode[p.category]}
            onClick={() => {
              setActiveId(p.id);
              setComposeOpen(false);
            }}
          />
        ))}
        {visibleProjects.length === 0 && <div className="empty-note">Tidak ada proyek yang cocok dengan filter ini.</div>}
      </div>

      {showClosed && closedProjects.length > 0 && (
        <>
          <div className="field-label" style={{ marginTop: 4 }}>
            Proyek Ditutup
          </div>
          <div className="project-pick-grid" style={{ marginBottom: 18 }}>
            {closedProjects.map((p) => (
              <ProjectPickCard
                key={p.id}
                project={p}
                selected={p.id === activeId}
                updated={p.last_log_period === period}
                category={byCode[p.category]}
                closed
                onClick={() => {
                  setActiveId(p.id);
                  setComposeOpen(false);
                }}
              />
            ))}
          </div>
        </>
      )}

      {loadingDetail || !detail ? (
        <div className="empty-note">Memuat...</div>
      ) : (
        <div className="team-grid">
          <div>
            <div className="card panel">
              <div className="panel-head">
                <div className="panel-title">Update Progres Mingguan</div>
                <button className="ghost-btn" type="button" onClick={toggleClose}>
                  {detail.closed_at ? "↺ Buka Kembali" : "Tutup Proyek"}
                </button>
              </div>
              <div className="panel-desc">
                {detail.name} · riwayat &amp; entri baru
                {detail.closed_at && <span className="badge b-teal" style={{ marginLeft: 8 }}>Ditutup</span>}
              </div>

              <div className="compose-toggle-wrap">
                {composeOpen ? (
                  <ComposeCard
                    currentStatus={detail.status}
                    periodLabel={period}
                    onSubmit={submitNewEntry}
                    onCancel={() => setComposeOpen(false)}
                  />
                ) : (
                  <button className="save-btn" onClick={() => setComposeOpen(true)} type="button">
                    ＋ Tambah Update Baru
                  </button>
                )}
              </div>

              <LogList logs={detail.logs} teamName={teamName} editable onSaveEdit={saveEditEntry} />
            </div>
          </div>

          <div>
            <div className="card panel">
              <div className="panel-head">
                <div className="panel-title">Checklist Deliverable</div>
              </div>
              <div className="panel-desc">Target: {detail.target_label}</div>
              <div className="progress-head">
                <div className="progress-num">{detail.actual_pct ?? 0}%</div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${detail.actual_pct ?? 0}%` }} />
                </div>
              </div>
              <ChecklistPanel phases={detail.checklist} readOnly={false} onItemClick={setModalItem} />
              <div className="info-callout">
                ⓘ Menandai deliverable selesai akan meminta tanggal, nomor dokumen, dan (jika relevan) vendor, nilai kontrak, serta link
                dokumen.
              </div>
            </div>
          </div>
        </div>
      )}

      {modalItem && (
        <ChecklistModal
          item={modalItem}
          projectName={detail?.name ?? ""}
          onClose={() => setModalItem(null)}
          onSave={saveChecklistItem}
          onUnmark={unmarkChecklistItem}
        />
      )}
    </AppShell>
  );
}

function ProjectPickCard({
  project,
  selected,
  updated,
  category,
  closed,
  onClick,
}: {
  project: ProjectTab;
  selected: boolean;
  updated: boolean;
  category?: { code: string; label: string; color: string } | null;
  closed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`project-pick-card ${selected ? "sel" : ""} ${closed ? "done" : ""}`}
      onClick={onClick}
    >
      <div className="project-pick-head">
        <CatChip category={category} code={project.category} />
        <span className="project-pick-name">{project.name}</span>
        {!closed && (
          <span
            className="tab-dot"
            style={{ background: updated ? "var(--green)" : "var(--amber)" }}
            title={updated ? "Sudah update minggu ini" : "Belum update minggu ini"}
          />
        )}
      </div>
      <span className="mini-bar-track">
        <span className="mini-bar-fill" style={{ width: `${project.actual_pct ?? 0}%` }} />
      </span>
      <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{project.actual_pct ?? 0}% checklist</span>
    </button>
  );
}
