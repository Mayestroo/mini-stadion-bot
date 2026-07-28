"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Menu, X, User, LogOut } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navLinks = [
    { href: "/stadionlar", label: "Stadionlar" },
    { href: "/bron", label: "Bron" },
  ];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 20px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: "var(--color-text-primary)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22 }}>⚽</span>
          <span>Sportly</span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 8 }} className="hidden md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                fontSize: 15,
                fontWeight: 500,
                textDecoration: "none",
                color: pathname === link.href ? "var(--color-accent)" : "var(--color-text-secondary)",
                backgroundColor: pathname === link.href ? "var(--color-accent-light)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              {link.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
              {user?.role === "moderator" || user?.role === "superadmin" ? (
                <Link
                  href="/admin"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-full)",
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-accent)",
                  }}
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/profil"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: "var(--color-text-primary)",
                  backgroundColor: "var(--color-bg-secondary)",
                }}
              >
                <User size={15} />
                {user?.full_name?.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px",
                  borderRadius: "var(--radius-full)",
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--color-text-secondary)",
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
              <Link
                href="/login"
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: "var(--color-text-primary)",
                  backgroundColor: "var(--color-bg-secondary)",
                }}
              >
                Kirish
              </Link>
              <Link
                href="/register"
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: "white",
                  backgroundColor: "var(--color-accent)",
                }}
              >
                Ro'yxat
              </Link>
            </div>
          )}
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden"
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: 8,
            color: "var(--color-text-primary)",
          }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div
          style={{
            backgroundColor: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            padding: "12px 20px 20px",
          }}
          className="md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block",
                padding: "14px 0",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--color-text-primary)",
                textDecoration: "none",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link href="/profil" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "14px 0", fontSize: 16, color: "var(--color-text-primary)", textDecoration: "none", borderBottom: "1px solid var(--color-border)" }}>
                Profil
              </Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "14px 0", fontSize: 16, color: "var(--color-error)", border: "none", background: "none", cursor: "pointer" }}>
                Chiqish
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-bg-secondary)", color: "var(--color-text-primary)", textDecoration: "none", fontWeight: 500 }}>Kirish</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} style={{ flex: 1, padding: "12px", textAlign: "center", borderRadius: "var(--radius-md)", backgroundColor: "var(--color-accent)", color: "white", textDecoration: "none", fontWeight: 600 }}>Ro'yxat</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
