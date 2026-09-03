"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal masuk.");
      return;
    }
    router.push(data.role === "admin" ? "/dashboard" : "/update");
    router.refresh();
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" style={{ background: "var(--navy-900)" }}>
            BI
          </div>
          <div>
            <div className="login-title">PANTAU</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>DPAN Progress Monitoring</div>
          </div>
        </div>
        <div className="login-sub">Masukkan kode akses yang diberikan oleh admin.</div>
        <form onSubmit={submit}>
          <input
            className="code-input"
            placeholder="cth. GPAN2-7F3K9Q"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          {error && <div className="form-error">{error}</div>}
          <button className="save-btn" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
