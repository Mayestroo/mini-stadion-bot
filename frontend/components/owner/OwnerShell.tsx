"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ownerApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { BarChart3, Bell, CalendarDays, ClipboardCheck, LogOut, Shield, Users, Warehouse } from "lucide-react";

const navItems = [
  { href: "/owner", label: "Dashboard", icon: BarChart3 },
  { href: "/owner/stadiums/new", label: "Stadion", icon: Warehouse },
  { href: "/owner/bookings", label: "Bronlar", icon: CalendarDays },
  { href: "/owner/moderation", label: "Status", icon: ClipboardCheck },
  { href: "/owner/customers", label: "Mijozlar", icon: Users },
  { href: "/owner/notifications", label: "Xabarlar", icon: Bell },
];

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const loadUnread = () => ownerApi.getUnreadNotifications().then((data) => setUnreadCount(data.unread_count || 0)).catch(() => setUnreadCount(0));
    loadUnread();
    const interval = window.setInterval(loadUnread, 15000);
    return () => window.clearInterval(interval);
  }, [pathname, user]);

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg, #07140d 0%, #f2f7f3 34%)", color: "#102015" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", padding: "18px 14px 96px" }}>
        <header style={{ color: "white", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.72)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                <Shield size={15} /> Owner kabinet
              </div>
              <h1 style={{ fontSize: 27, lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.04em", marginTop: 7 }}>{user?.full_name || "Owner"}</h1>
            </div>
            <button
              onClick={() => { logout(); router.push("/owner/login"); }}
              style={{ border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.12)", color: "white", borderRadius: 16, width: 44, height: 44, display: "grid", placeItems: "center", cursor: "pointer" }}
              aria-label="Chiqish"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {children}
      </div>

      <nav style={{ position: "fixed", left: "50%", bottom: 12, transform: "translateX(-50%)", width: "calc(100% - 24px)", maxWidth: 496, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, padding: 6, borderRadius: 24, background: "rgba(255,255,255,0.86)", border: "1px solid rgba(16,32,21,0.1)", boxShadow: "0 18px 50px rgba(7,20,13,0.18)", backdropFilter: "blur(18px)" }}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{ height: 54, borderRadius: 18, display: "grid", placeItems: "center", color: active ? "#0f9f4b" : "#768077", background: active ? "rgba(52,199,89,0.14)" : "transparent", fontSize: 10, fontWeight: 800, position: "relative" }}>
                <Icon size={19} />
                {item.href === "/owner/notifications" && unreadCount > 0 ? (
                  <span style={{ position: "absolute", top: 5, right: 12, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 10, background: "#ff3b30", color: "white", fontSize: 10, display: "grid", placeItems: "center" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
                ) : null}
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function OwnerCard({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <section className={className} style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(16,32,21,0.08)", borderRadius: 26, boxShadow: "0 18px 48px rgba(7,20,13,0.08)", padding: 18, ...style }}>{children}</section>;
}

export function OwnerButton({ children, onClick, disabled, tone = "green", type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: "green" | "red" | "dark"; type?: "button" | "submit" }) {
  const bg = tone === "red" ? "#ff3b30" : tone === "dark" ? "#102015" : "#19b95a";
  return <button type={type} onClick={onClick} disabled={disabled} style={{ border: 0, borderRadius: 16, padding: "12px 15px", background: bg, color: "white", fontSize: 14, fontWeight: 850, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.62 : 1 }}>{children}</button>;
}

export function OwnerInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ width: "100%", border: "1px solid rgba(16,32,21,0.12)", borderRadius: 15, padding: "12px 13px", fontSize: 15, outline: "none", background: "#fbfdfb", ...props.style }} />;
}
