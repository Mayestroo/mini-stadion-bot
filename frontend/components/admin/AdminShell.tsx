"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { CalendarDays, LogOut, Menu, ShieldCheck, Warehouse } from "lucide-react";

const baseItems = [
  { href: "/admin", label: "Panel", icon: ShieldCheck },
  { href: "/admin/bronlar", label: "Bronlar", icon: CalendarDays },
  { href: "/admin/stadionlar", label: "Stadion", icon: Warehouse },
  { href: "/admin/more", label: "More", icon: Menu },
];

export function AdminShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const items = baseItems;

  return (
    <div className="mini-app" style={{ maxWidth: 480, margin: "0 auto", position: "relative", boxShadow: "0 18px 60px rgba(0,0,0,0.12)" }}>
      <main className="mini-page">
        <header className="mini-title-row" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="mini-eyebrow" style={{ color: "var(--mini-green)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>
              {user?.role === "superadmin" ? "Superadmin" : "Moderator"}
            </div>
            <h1 className="mini-large-title">{title}</h1>
            {subtitle ? <p className="mini-subtitle">{subtitle}</p> : null}
          </div>
          <button
            onClick={() => { logout(); router.push("/miniapp"); }}
            className="mini-card-solid mini-pressable"
            style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 16, color: "var(--mini-red)", cursor: "pointer" }}
            aria-label="Chiqish"
          >
            <LogOut size={18} />
          </button>
        </header>

        {children}
      </main>

      <nav className="mini-tabbar" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mini-tab mini-pressable${active ? " mini-tab-active" : ""}`}
              style={{ textDecoration: "none", minWidth: 0 }}
            >
              <Icon size={20} strokeWidth={active ? 2.6 : 2.1} />
              <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AdminCard({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <section className={`mini-card${className ? ` ${className}` : ""}`} style={{ padding: 16, color: "var(--mini-text)", ...style }}>{children}</section>;
}

export function AdminButton({ children, onClick, disabled, tone = "green", type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "green" | "red" | "blue" | "dark"; type?: "button" | "submit" }) {
  const backgrounds = {
    green: "linear-gradient(180deg, #38d46a 0%, #30b95b 100%)",
    red: "var(--mini-red)",
    blue: "var(--mini-blue)",
    dark: "var(--mini-text)",
  };
  return <button type={type} onClick={onClick} disabled={disabled} className="mini-pressable" style={{ border: 0, borderRadius: 17, padding: "12px 15px", background: backgrounds[tone], color: "white", fontSize: 14, fontWeight: 750, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.62 : 1, boxShadow: tone === "green" ? "0 12px 22px rgba(52, 199, 89, 0.22)" : "none" }}>{children}</button>;
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ width: "100%", padding: "12px 14px", borderRadius: 15, border: "1px solid var(--mini-line)", background: "var(--mini-surface-solid)", color: "var(--mini-text)", outline: "none", fontSize: 15, ...props.style }} />;
}

export function AdminTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ width: "100%", padding: "12px 14px", borderRadius: 15, border: "1px solid var(--mini-line)", background: "var(--mini-surface-solid)", color: "var(--mini-text)", outline: "none", fontSize: 15, resize: "vertical", ...props.style }} />;
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ width: "100%", padding: "12px 14px", borderRadius: 15, border: "1px solid var(--mini-line)", background: "var(--mini-surface-solid)", color: "var(--mini-text)", outline: "none", fontSize: 15, ...props.style }} />;
}

export function AdminStatusBadge({ status, label }: { status: string; label?: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("confirm") || normalized.includes("approve") || normalized.includes("active") || normalized === "faol" ? "green" : normalized.includes("pending") || normalized.includes("kut") ? "orange" : normalized.includes("reject") || normalized.includes("cancel") || normalized.includes("inactive") ? "red" : "blue";
  const color = tone === "green" ? "var(--mini-green)" : tone === "orange" ? "var(--mini-orange)" : tone === "red" ? "var(--mini-red)" : "var(--mini-blue)";

  return <span className="mini-chip" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, whiteSpace: "nowrap" }}>{label || status}</span>;
}

export function AdminLoading({ text = "Yuklanmoqda..." }: { text?: string }) {
  return (
    <AdminCard style={{ textAlign: "center", padding: "34px 22px", color: "var(--mini-muted)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid var(--mini-green)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      <p style={{ fontSize: 14 }}>{text}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminCard>
  );
}

export function AdminEmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <AdminCard style={{ textAlign: "center", padding: "42px 22px", color: "var(--mini-muted)" }}>
      <div className="mini-glyph mini-glyph-muted" style={{ width: 58, height: 58, borderRadius: 22, margin: "0 auto 14px" }}>
        {icon}
      </div>
      <h2 style={{ color: "var(--mini-text)", fontSize: 20, marginBottom: 6 }}>{title}</h2>
      <p style={{ fontSize: 14, lineHeight: 1.4 }}>{text}</p>
    </AdminCard>
  );
}

export function AdminInfoRow({ icon, label, value, last }: { icon?: React.ReactNode; label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: last ? 0 : "1px solid var(--mini-line)" }}>
      {icon ? <span style={{ color: "var(--mini-muted)", display: "inline-flex", flexShrink: 0 }}>{icon}</span> : null}
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--mini-muted)", fontSize: 12 }}>{label}</div>
        <div style={{ color: "var(--mini-text)", fontSize: 14, fontWeight: 650, overflowWrap: "anywhere" }}>{value}</div>
      </div>
    </div>
  );
}

export function AdminSubTabs({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();

  return (
    <div className="mini-card-solid" style={{ display: "flex", gap: 6, padding: 6, marginBottom: 12, overflowX: "auto" }}>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="mini-pressable"
            style={{
              flex: "1 0 auto",
              textAlign: "center",
              textDecoration: "none",
              borderRadius: 15,
              padding: "10px 12px",
              background: active ? "rgba(52, 199, 89, 0.15)" : "transparent",
              color: active ? "var(--mini-green)" : "var(--mini-muted)",
              fontSize: 13,
              fontWeight: 750,
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
