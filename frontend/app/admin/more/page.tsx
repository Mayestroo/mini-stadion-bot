"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { BarChart3, Bell, ClipboardCheck, Dumbbell, Megaphone, ScrollText, Users } from "lucide-react";
import { AdminCard, AdminShell } from "@/components/admin/AdminShell";

const superadminItems = [
  { href: "/admin/owners", label: "Ownerlar", text: "Owner yaratish va boshqarish", icon: Users },
  { href: "/admin/mashgulotlar", label: "Mashg'ulotlar", text: "Treninglarni boshqarish (top va faol holati)", icon: Dumbbell },
  { href: "/admin/moderation/stadiums", label: "Moderatsiya", text: "Stadion, mashg'ulot, rasm va cancel requestlar", icon: ClipboardCheck },
  { href: "/admin/broadcast", label: "Ommaviy xabar", text: "Broadcast va reklama yuborish", icon: Megaphone },
  { href: "/admin/audit", label: "Audit log", text: "Superadmin action tarixi", icon: ScrollText },
  { href: "/admin/statistics", label: "Statistika", text: "Revenue, booking va bot metrikalari", icon: BarChart3 },
];

const commonItems = [
  { href: "/admin/notifications", label: "Inbox", text: "Admin tizim xabarlari", icon: Bell },
];

export default function AdminMorePage() {
  const { user } = useAuthStore();
  const items = user?.role === "superadmin" ? [...commonItems, ...superadminItems] : commonItems;
  return (
    <AdminShell title="More" subtitle="Qo'shimcha boshqaruv bo'limlari">
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <AdminCard style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="mini-glyph mini-glyph-blue"><Icon size={21} /></div>
                <div>
                  <strong>{item.label}</strong>
                  <p style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 3 }}>{item.text}</p>
                </div>
              </AdminCard>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
