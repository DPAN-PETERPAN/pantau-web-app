"use client";

import { useState } from "react";
import type { WeeklyLog } from "@/lib/types";
import { formatDateID, formatTimeID } from "@/lib/period";
import { BulletEditor } from "./BulletEditor";

export function LogList({
  logs,
  teamName,
  editable,
  onSaveEdit,
}: {
  logs: WeeklyLog[];
  teamName: string;
  editable: boolean;
  onSaveEdit?: (logId: string, payload: { progres: string[]; rencana: string[]; link_url: string }) => Promise<string | void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (logs.length === 0) {
    return <div className="empty-log">Belum ada update untuk proyek ini.</div>;
  }

  return (
    <>
      {logs.map((entry) =>
        editingId === entry.id ? (
          <EditEntry
            key={entry.id}
            entry={entry}
            onCancel={() => setEditingId(null)}
            onSave={async (payload) => {
              const err = await onSaveEdit?.(entry.id, payload);
              if (!err) setEditingId(null);
              return err;
            }}
          />
        ) : (
          <ViewEntry key={entry.id} entry={entry} teamName={teamName} editable={editable} onEdit={() => setEditingId(entry.id)} />
        )
      )}
    </>
  );
}

function ViewEntry({
  entry,
  teamName,
  editable,
  onEdit,
}: {
  entry: WeeklyLog;
  teamName: string;
  editable: boolean;
  onEdit: () => void;
}) {
  const submitted = new Date(entry.submitted_at);
  return (
    <div className="log-entry">
      <div className="log-head">
        <span className="log-date">
          {formatDateID(submitted)} · {formatTimeID(submitted)}
        </span>
        <span className="log-author">
          {teamName} · {entry.period_label}
        </span>
        {entry.edited_at && <span className="log-edited">diedit {formatDateID(new Date(entry.edited_at))}</span>}
        {editable && (
          <button className="log-edit-btn" onClick={onEdit} type="button">
            ✎ Edit
          </button>
        )}
      </div>
      <div className="log-sub-label">Progres</div>
      <ul>
        {entry.progres.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      {entry.rencana.length > 0 && (
        <>
          <div className="log-sub-label">Rencana Tindak Lanjut</div>
          <ul>
            {entry.rencana.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </>
      )}
      {entry.link_url && (
        <div className="link-field" style={{ marginTop: 8 }}>
          <span className="link-icon">🔗</span>
          <a href={entry.link_url} target="_blank" rel="noreferrer" style={{ color: "var(--blue)", fontSize: "12.5px" }}>
            {entry.link_url}
          </a>
        </div>
      )}
    </div>
  );
}

function EditEntry({
  entry,
  onCancel,
  onSave,
}: {
  entry: WeeklyLog;
  onCancel: () => void;
  onSave: (payload: { progres: string[]; rencana: string[]; link_url: string }) => Promise<string | void>;
}) {
  const [progres, setProgres] = useState<string[]>(entry.progres.length ? entry.progres : [""]);
  const [rencana, setRencana] = useState<string[]>(entry.rencana.length ? entry.rencana : [""]);
  const [linkUrl, setLinkUrl] = useState(entry.link_url ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const err = await onSave({ progres: progres.filter((p) => p.trim()), rencana: rencana.filter((r) => r.trim()), link_url: linkUrl });
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <div className="log-entry">
      <div className="log-head">
        <span className="log-date">
          {formatDateID(new Date(entry.submitted_at))} · {formatTimeID(new Date(entry.submitted_at))}
        </span>
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="field-label" style={{ marginTop: 6 }}>
        Progres
      </div>
      <BulletEditor values={progres} onChange={setProgres} placeholder="Tulis progres..." />
      <div className="field-label">Rencana tindak lanjut</div>
      <BulletEditor values={rencana} onChange={setRencana} placeholder="Tulis rencana..." />
      <div className="field-label">Link Dokumen (opsional)</div>
      <div className="link-field">
        <span className="link-icon">🔗</span>
        <input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      </div>
      <div className="panel-footer" style={{ marginTop: 10 }}>
        <button className="ghost-btn" type="button" onClick={onCancel}>
          Batal
        </button>
        <button className="save-btn" type="button" onClick={save} disabled={saving}>
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}
