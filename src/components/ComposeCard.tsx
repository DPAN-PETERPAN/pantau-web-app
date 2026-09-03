"use client";

import { useState } from "react";
import { BulletEditor } from "./BulletEditor";

const STATUS_OPTS: { v: string; l: string; c: string }[] = [
  { v: "ontrack", l: "On Track", c: "st-ontrack" },
  { v: "behind", l: "Behind", c: "st-behind" },
  { v: "alert", l: "Alert", c: "st-alert" },
  { v: "notstarted", l: "Belum Mulai", c: "st-notstarted" },
  { v: "done", l: "Selesai", c: "st-done" },
];

export function ComposeCard({
  currentStatus,
  periodLabel,
  onSubmit,
  onCancel,
}: {
  currentStatus: string;
  periodLabel: string;
  onSubmit: (payload: { status: string; progres: string[]; rencana: string[]; link_url: string }) => Promise<string | void>;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [progres, setProgres] = useState<string[]>([""]);
  const [rencana, setRencana] = useState<string[]>([""]);
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cleanProgres = progres.filter((p) => p.trim());
    if (cleanProgres.length === 0) {
      setError("Isi minimal satu poin progres sebelum menyimpan.");
      return;
    }
    setSaving(true);
    const err = await onSubmit({ status, progres: cleanProgres, rencana: rencana.filter((r) => r.trim()), link_url: linkUrl });
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <div className="compose-card">
      <div className="panel-desc" style={{ marginTop: 0 }}>
        Entri baru · {periodLabel}
      </div>
      {error && <div className="form-error">{error}</div>}

      <div className="field-label">
        Status proyek keseluruhan <span className="req">*</span>
      </div>
      <div className="status-picker">
        {STATUS_OPTS.map((o) => (
          <button
            key={o.v}
            type="button"
            className={`status-opt ${o.c} ${o.v === status ? "sel" : ""}`}
            onClick={() => setStatus(o.v)}
          >
            <span className="sw" style={{ background: "currentColor" }} />
            {o.l}
          </button>
        ))}
      </div>

      <div className="field-label">
        Progres minggu ini <span className="req">*</span>
      </div>
      <BulletEditor values={progres} onChange={setProgres} placeholder="Tulis progres..." />

      <div className="field-label">Rencana tindak lanjut</div>
      <BulletEditor values={rencana} onChange={setRencana} placeholder="Tulis rencana..." />

      <div className="field-label">Link Dokumen (opsional)</div>
      <div className="link-field">
        <span className="link-icon">🔗</span>
        <input type="url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      </div>

      <div className="panel-footer">
        <button className="ghost-btn" type="button" onClick={onCancel}>
          Batal
        </button>
        <button className="save-btn" type="button" onClick={save} disabled={saving}>
          Simpan sebagai Update Baru
        </button>
      </div>
    </div>
  );
}
