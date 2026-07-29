"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Menu, X, User, LogOut } from "lucide-react";
import Image from "next/image";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: isHome ? "rgba(8, 12, 20, 0.85)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: isHome ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid var(--color-border)",
      }}
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
        style={{
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 20,
            color: isHome ? "#ffffff" : "var(--color-text-primary)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Image src="/sportly-icon.svg" alt="Sportly" width={28} height={28} style={{ display: "block" }} />
          <span className="tracking-tight">Sportly</span>
        </Link>

        <nav className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 12 }}>
              {user?.role === "moderator" || user?.role === "superadmin" ? (
                <Link
                  href="/admin"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "9999px",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    color: isHome ? "#34d399" : "var(--color-accent)",
                    border: isHome ? "1px solid rgba(52, 211, 153, 0.4)" : "1px solid var(--color-accent)",
                    backgroundColor: isHome ? "rgba(52, 211, 153, 0.1)" : "transparent",
                  }}
                >
                  Admin
                </Link>
              ) : null}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "9999px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: isHome ? "#f8fafc" : "var(--color-text-primary)",
                  backgroundColor: isHome ? "rgba(255, 255, 255, 0.08)" : "var(--color-bg-secondary)",
                }}
              >
                <User size={15} />
                {user?.full_name?.split(" ")[0]}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px",
                  borderRadius: "9999px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: isHome ? "#94a3b8" : "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 12 }}>
              <Link
                href="/login"
                style={{
                  minHeight: 42,
                  padding: "8px 18px",
                  borderRadius: "10px",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  color: isHome ? "#cbd5e1" : "var(--color-text-primary)",
                  backgroundColor: isHome ? "rgba(255, 255, 255, 0.05)" : "var(--color-bg-secondary)",
                  border: isHome ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Kirish
              </Link>
              <Link
                href="/register"
                style={{
                  minHeight: 42,
                  padding: "8px 20px",
                  borderRadius: "10px",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  color: "#090d16",
                  backgroundColor: isHome ? "#10b981" : "var(--color-accent)",
                  boxShadow: "0 2px 10px rgba(16, 185, 129, 0.2)",
                  transition: "all 0.15s ease",
                }}
              >
                Ro'yxat
              </Link>
            </div>
          )}
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex items-center justify-center"
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: 10,
            minWidth: 44,
            minHeight: 44,
            color: isHome ? "#ffffff" : "var(--color-text-primary)",
          }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div
          style={{
            backgroundColor: isHome ? "#0f172a" : "var(--color-surface)",
            borderTop: isHome ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid var(--color-border)",
            padding: "16px 20px 24px",
          }}
          className="md:hidden"
        >
          {isAuthenticated ? (
            <>
              <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "14px 0", fontSize: 16, color: isHome ? "#ffffff" : "var(--color-text-primary)", textDecoration: "none", borderBottom: isHome ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid var(--color-border)" }}>
                Bosh sahifa
              </Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "14px 0", fontSize: 16, color: "#f87171", border: "none", background: "none", cursor: "pointer" }}>
                Chiqish
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, padding: "12px", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", backgroundColor: isHome ? "rgba(255, 255, 255, 0.08)" : "var(--color-bg-secondary)", color: isHome ? "#ffffff" : "var(--color-text-primary)", textDecoration: "none", fontWeight: 500 }}>Kirish</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} style={{ flex: 1, padding: "12px", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px", backgroundColor: isHome ? "#10b981" : "var(--color-accent)", color: "#090d16", textDecoration: "none", fontWeight: 600 }}>Ro'yxat</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
