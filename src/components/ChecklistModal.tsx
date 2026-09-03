"use client";

import { useState } from "react";
import type { ChecklistItem } from "@/lib/types";

export function ChecklistModal({
  item,
  projectName,
  onClose,
  onSave,
  onUnmark,
}: {
  item: ChecklistItem;
  projectName: string;
  onClose: () => void;
  onSave: (payload: {
    doc_date: string;
    doc_number: string;
    vendor: string;
    contract_value: string;
    doc_link: string;
    notes: string;
  }) => Promise<string | void>;
  onUnmark: () => Promise<void>;
}) {
  const [docDate, setDocDate] = useState(item.doc_date ?? "");
  const [docNumber, setDocNumber] = useState(item.doc_number ?? "");
  const [vendor, setVendor] = useState(item.vendor ?? "");
  const [contractValue, setContractValue] = useState(item.contract_value ?? "");
  const [docLink, setDocLink] = useState(item.doc_link ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!docDate) {
      setError("Tanggal terbit/disetujui wajib diisi.");
      return;
    }
    setSaving(true);
    const err = await onSave({ doc_date: docDate, doc_number: docNumber, vendor, contract_value: contractValue, doc_link: docLink, notes });
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow">
        <button className="modal-close" onClick={onClose} type="button">
          ×
        </button>
        <div className="modal-title-row">
          <h2 style={{ margin: 0 }}>
            {item.done ? "Detail" : "Tandai Selesai"}: {item.name}
          </h2>
        </div>
        <div className="modal-sub">{projectName}</div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-field">
          <label>
            Tanggal Terbit / Disetujui <span className="opt">wajib</span>
          </label>
          <input type="date" className="form-input" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
        </div>
        <div className="form-field">
          <label>
            Nomor Dokumen <span className="opt">opsional</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="cth. 28/160/DMAP-GPPS-PBS/Srt/B"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
          />
        </div>
        <div className="form-row2">
          <div className="form-field">
            <label>
              Nama Vendor / Pelaksana <span className="opt">jika ada</span>
            </label>
            <input type="text" className="form-input" placeholder="cth. PT Prosys" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div className="form-field">
            <label>
              Nilai Kontrak <span className="opt">jika ada</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="cth. Rp1.506.985.000"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
            />
          </div>
        </div>
        <div className="form-field">
          <label>
            Link Dokumen <span className="opt">Google Drive / SharePoint / dll, jika ada</span>
          </label>
          <input
            type="url"
            className="form-input"
            placeholder="https://..."
            value={docLink}
            onChange={(e) => setDocLink(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>
            Catatan <span className="opt">opsional</span>
          </label>
          <textarea className="form-textarea" placeholder="Catatan tambahan..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="modal-footer">
          {item.done && (
            <button className="btn-danger-text" type="button" onClick={onUnmark}>
              Tandai Belum Selesai
            </button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="ghost-btn" type="button" onClick={onClose}>
              Batal
            </button>
            <button className="save-btn" type="button" onClick={save} disabled={saving}>
              {item.done ? "Simpan Perubahan" : "Tandai Selesai & Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
