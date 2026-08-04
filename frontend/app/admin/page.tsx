"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { superadminApi } from "@/lib/api";
import { AdminStatistics } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { AdminCard, AdminShell } from "@/components/admin/AdminShell";
import { BarChart3, CalendarDays, ClipboardCheck, MessageCircle, ShieldCheck, Sparkles, UserRound, Warehouse } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && (!isAuthenticated || (user?.role !== "moderator" && user?.role !== "superadmin"))) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, user, router]);

  const stats = useQuery<AdminStatistics>({
    queryKey: ["admin-statistics"],
    queryFn: superadminApi.getStatistics,
    enabled: user?.role === "superadmin",
    staleTime: 30_000,
  });

  if (!user) return null;

  const roleLabel = user.role === "superadmin" ? "Super Admin" : "Moderator";
  const pendingTotal = stats.data ? Object.values(stats.data.pending_moderation).reduce((sum, v) => sum + v, 0) : null;

  return (
    <AdminShell title="Admin panel" subtitle="Boshqaruv va moderatsiya markazi">
        <div style={{ display: "grid", gap: 14 }}>
          <AdminCard style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <div className="mini-glyph mini-glyph-blue" style={{ width: 58, height: 58, borderRadius: 22, flexShrink: 0 }}>
              <ShieldCheck size={28} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--mini-green)", fontSize: 12, fontWeight: 800, marginBottom: 3 }}>
                <Sparkles size={13} /> Faol sessiya
              </div>
              <h2 style={{ fontSize: 21, lineHeight: 1.12, fontWeight: 820, letterSpacing: "-0.03em" }}>{user.full_name}</h2>
              <p style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 3 }}>{roleLabel} huquqlari bilan kirildi</p>
            </div>
          </AdminCard>

          <div className="mini-card-solid" style={{ padding: "8px 16px" }}>
            <InfoRow icon={<UserRound size={16} />} label="Hisob" value={user.phone || "Telefon ulanmagan"} />
            {user.telegram_id ? <InfoRow icon={<MessageCircle size={16} />} label="Telegram ID" value={user.telegram_id} /> : null}
            <InfoRow icon={<ShieldCheck size={16} />} label="Rol" value={roleLabel} last />
          </div>

          {user.role === "superadmin" && stats.data ? (
            <div className="mini-responsive-grid-2">
              <KpiLink href="/admin/moderation/stadiums" label="Pending moderatsiya" value={String(pendingTotal)} tone={pendingTotal && pendingTotal > 0 ? "orange" : undefined} />
              <KpiLink href="/admin/statistics" label="Bugungi aylanma" value={formatPrice(stats.data.revenue.today || 0)} />
              <KpiLink href="/admin/bronlar" label="Jami bronlar" value={String(stats.data.total_bookings)} />
              <KpiLink href="/admin/statistics" label="Yangi userlar (oy)" value={String(stats.data.new_users.month || 0)} />
            </div>
          ) : null}

          <div className="mini-title-row" style={{ marginBottom: 0 }}>
            <div>
              <div className="mini-eyebrow">Tezkor amallar</div>
              <h2 style={{ fontSize: 22, fontWeight: 780, letterSpacing: "-0.02em" }}>Nimani boshqaramiz?</h2>
            </div>
          </div>

          <div className="mini-responsive-grid-2">
            <DashboardAction href="/admin/stadionlar" icon={<Warehouse size={22} />} title="Stadionlar" subtitle="Maydonlar" tone="green" />
            <DashboardAction href="/admin/bronlar" icon={<CalendarDays size={22} />} title="Bronlar" subtitle="Buyurtmalar" tone="blue" />

            {user.role === "superadmin" ? (
              <>
                <DashboardAction href="/admin/users" icon={<UserRound size={22} />} title="Userlar" subtitle="Rol berish" tone="orange" />
                <DashboardAction href="/admin/moderation/stadiums" icon={<ClipboardCheck size={22} />} title="Review" subtitle="Tasdiqlar" tone="green" />
                <DashboardAction href="/admin/statistics" icon={<BarChart3 size={22} />} title="Statistika" subtitle="Analytics" tone="blue" wide />
              </>
            ) : null}
          </div>

          <p style={{ color: "var(--mini-muted)", fontSize: 13, lineHeight: 1.45, margin: "0 4px" }}>
            Pastdagi tablardan sahifalar orasida tez o'tishingiz mumkin. Har bir bo'lim mini-app ichidagi foydalanuvchi sahifalari bilan bir xil UI uslubida ishlaydi.
          </p>
        </div>
    </AdminShell>
  );
}

function KpiLink({ href, label, value, tone }: { href: string; label: string; value: string; tone?: "orange" }) {
  const color = tone === "orange" ? "var(--mini-orange)" : "var(--mini-green)";
  return (
    <Link href={href} className="mini-card-solid mini-pressable" style={{ padding: 14, textDecoration: "none", color: "var(--mini-text)" }}>
      <div style={{ color: "var(--mini-muted)", fontSize: 12, fontWeight: 700, minHeight: 30 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 850, letterSpacing: "-0.03em", marginTop: 6, color }}>{value}</div>
    </Link>
  );
}

function DashboardAction({ href, icon, title, subtitle, tone, wide }: { href: string; icon: React.ReactNode; title: string; subtitle: string; tone: "green" | "blue" | "orange"; wide?: boolean }) {
  const glyphClass = tone === "blue" ? "mini-glyph-blue" : tone === "orange" ? "mini-glyph-orange" : "";

  return (
    <Link href={href} className="mini-card-solid mini-pressable" style={{ border: 0, cursor: "pointer", padding: 15, textAlign: "left", color: "var(--mini-text)", textDecoration: "none", gridColumn: wide ? "1 / -1" : undefined }}>
      <div className={`mini-glyph ${glyphClass}`} style={{ marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 760 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--mini-muted)", marginTop: 2 }}>{subtitle}</div>
    </Link>
  );
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: last ? 0 : "1px solid var(--mini-line)" }}>
      <span style={{ color: "var(--mini-muted)", display: "inline-flex" }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, color: "var(--mini-muted)" }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 650 }}>{value}</div>
      </div>
    </div>
  );
}
