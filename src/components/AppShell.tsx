"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({
  role,
  teamName,
  title,
  subtitle,
  topbarRight,
  children,
}: {
  role: "admin" | "team";
  teamName?: string;
  title: string;
  subtitle: string;
  topbarRight?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-icon.svg" alt="PANTAU" className="brand-mark" />
          <div className="brand-text">
            <div className="l1">PANTAU</div>
            <div className="l2">Portal Antar Unit untuk Monitoring Terpadu</div>
          </div>
        </div>

        <div className="nav-group-label">Menu</div>
        <ul className="nav">
          {role === "team" && (
            <li>
              <Link href="/update" className={pathname?.startsWith("/update") ? "active" : ""}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h10M4 18h7" />
                </svg>
                Update Mingguan
                <span className="dot" />
              </Link>
            </li>
          )}
          {role === "admin" && (
            <>
              <li>
                <Link href="/dashboard" className={pathname?.startsWith("/dashboard") ? "active" : ""}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="9" rx="1.5" />
                    <rect x="14" y="3" width="7" height="5" rx="1.5" />
                    <rect x="14" y="12" width="7" height="9" rx="1.5" />
                    <rect x="3" y="16" width="7" height="5" rx="1.5" />
                  </svg>
                  Dashboard Admin
                  <span className="dot" />
                </Link>
              </li>
              <li>
                <Link href="/admin/projects" className={pathname?.startsWith("/admin/projects") ? "active" : ""}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 3v5h5M9 13h6M9 17h6" />
                  </svg>
                  Kelola Proyek &amp; Tim
                  <span className="dot" />
                </Link>
              </li>
              <li>
                <Link href="/admin/tokens" className={pathname?.startsWith("/admin/tokens") ? "active" : ""}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Kelola Kode Akses
                  <span className="dot" />
                </Link>
              </li>
            </>
          )}
        </ul>

        <div className="sidebar-footer">
          <div className="role-pill">
            {role === "admin" ? (
              <>
                Masuk sebagai <b>Admin</b>
              </>
            ) : (
              <>
                Tim: <b>{teamName}</b>
              </>
            )}
          </div>
          <button className="logout-btn" onClick={logout}>
            ⏻ Keluar
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            <div className="sub">{subtitle}</div>
          </div>
          <div className="topbar-right">
            {topbarRight}
            <div className="avatar" style={role === "admin" ? { background: "var(--gold)", color: "#fff" } : undefined}>
              {role === "admin" ? "A" : teamName?.charAt(0) ?? "T"}
            </div>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
