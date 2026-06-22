"use client";

import { useQuery } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { AdminStatistics } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { AdminCard, AdminEmptyState, AdminLoading, AdminShell } from "@/components/admin/AdminShell";
import { BarChart3 } from "lucide-react";

export default function AdminStatisticsPage() {
  const { data, isLoading, isError } = useQuery<AdminStatistics>({ queryKey: ["admin-statistics"], queryFn: superadminApi.getStatistics });

  if (isLoading || !data) {
    return <AdminShell title="Statistika"><AdminLoading /></AdminShell>;
  }
  if (isError) {
    return <AdminShell title="Statistika"><AdminCard><p style={{ color: "var(--mini-red)", fontWeight: 700 }}>Xatolik yuz berdi. Statistikani yuklab bo'lmadi.</p></AdminCard></AdminShell>;
  }

  const kpis = [
    { label: "Jami pul aylanmasi", value: formatPrice(data.revenue.total || 0), tone: "green" },
    { label: "Bugungi aylanma", value: formatPrice(data.revenue.today || 0), tone: "blue" },
    { label: "Oylik aylanma", value: formatPrice(data.revenue.month || 0), tone: "orange" },
    { label: "Bot orqali aylanma", value: formatPrice(data.revenue.bot_total || 0), tone: "blue" },
    { label: "Jami bronlar", value: String(data.total_bookings), tone: "green" },
    { label: "O'rtacha bron", value: formatPrice(data.average_booking_price || 0), tone: "orange" },
    { label: "Unique Telegram", value: String(data.unique_telegram_users), tone: "blue" },
    { label: "Pending moderation", value: String(sumObject(data.pending_moderation)), tone: "orange" },
  ];

  return (
    <AdminShell title="Platforma statistikasi" subtitle="Pul aylanmasi, bot faolligi, stadionlar reytingi va conversion">
        <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 12 }}>
          {kpis.map((item) => <StatCard key={item.label} {...item} />)}
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <Panel title="Bot kirishlari">
            <Metric label="Bugun" value={data.bot_events.today || 0} />
            <Metric label="Hafta" value={data.bot_events.week || 0} />
            <Metric label="Oy" value={data.bot_events.month || 0} />
            <Metric label="Yil" value={data.bot_events.year || 0} />
          </Panel>

          <Panel title="Booking statuslari">
            {Object.entries(data.booking_statuses).map(([key, value]) => <Metric key={key} label={key} value={value} />)}
          </Panel>

          <Panel title="Conversion">
            <Metric label="Bot start" value={data.conversion.bot_start || 0} />
            <Metric label="Phone/auth" value={data.conversion.phone_or_auth || 0} />
            <Metric label="Booking" value={data.conversion.booking_created || 0} />
          </Panel>

          <Panel title="Yangi userlar">
            <Metric label="Bugun" value={data.new_users.today || 0} />
            <Metric label="Hafta" value={data.new_users.week || 0} />
            <Metric label="Oy" value={data.new_users.month || 0} />
            <Metric label="Yil" value={data.new_users.year || 0} />
          </Panel>
        </section>

        <section style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <Panel title="Eng ko'p foydalanilgan stadionlar">
            {data.top_by_bookings.length === 0 ? <Empty /> : data.top_by_bookings.map((row) => <Metric key={row.stadium_id} label={row.name} value={row.bookings} />)}
          </Panel>

          <Panel title="Eng ko'p daromad qilgan stadionlar">
            {data.top_by_revenue.length === 0 ? <Empty /> : data.top_by_revenue.map((row) => <Metric key={row.stadium_id} label={row.name} value={formatPrice(row.revenue)} />)}
          </Panel>
        </section>
    </AdminShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  const glyphClass = tone === "blue" ? "mini-glyph-blue" : tone === "orange" ? "mini-glyph-orange" : "";
  return <div className="mini-card-solid" style={{ padding: 14 }}><div className={`mini-glyph ${glyphClass}`} style={{ width: 34, height: 34, borderRadius: 13, marginBottom: 10 }}><BarChart3 size={17} /></div><div style={{ color: "var(--mini-muted)", fontSize: 12, fontWeight: 700, minHeight: 34 }}>{label}</div><div style={{ fontSize: 20, fontWeight: 850, letterSpacing: "-0.03em", marginTop: 7 }}>{value}</div></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <AdminCard><h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>{title}</h2><div style={{ display: "grid", gap: 10 }}>{children}</div></AdminCard>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 9, borderBottom: "1px solid var(--mini-line)" }}><span style={{ color: "var(--mini-muted)" }}>{label}</span><b>{value}</b></div>;
}

function Empty() {
  return <AdminEmptyState icon={<BarChart3 size={24} />} title="Ma'lumot yo'q" text="Bu bo'lim uchun hali statistik ma'lumot shakllanmagan." />;
}

function sumObject(values: Record<string, number>) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}
