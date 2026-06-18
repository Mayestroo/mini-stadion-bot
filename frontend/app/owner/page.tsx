"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { OwnerCard, OwnerShell } from "@/components/owner/OwnerShell";

export default function OwnerDashboardPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["owner-stats"], queryFn: ownerApi.stats });
  const cards = [
    { label: "Bugungi bron", value: stats?.today_bookings ?? 0 },
    { label: "Pending bron", value: stats?.pending_bookings ?? 0 },
    { label: "Oylik daromad", value: stats ? formatPrice(stats.monthly_revenue) : "0 so'm" },
    { label: "Aktiv stadion", value: stats?.active_stadiums ?? 0 },
    { label: "Moderatsiya", value: stats?.pending_moderation ?? 0 },
  ];

  return (
    <OwnerShell>
      <div style={{ display: "grid", gap: 12 }}>
        <OwnerCard style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(224,255,235,0.94))" }}>
          <div style={{ color: "#627064", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Operatsion markaz</div>
          <h2 style={{ fontSize: 28, fontWeight: 950, letterSpacing: "-0.05em", marginTop: 4 }}>Stadionlaringiz holati</h2>
          <p style={{ color: "#627064", marginTop: 6 }}>Bronlar, daromad va superadmin tasdig'idagi o'zgarishlar.</p>
        </OwnerCard>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {cards.map((card) => (
            <OwnerCard key={card.label} style={{ minHeight: 104 }}>
              <div style={{ color: "#6b756d", fontSize: 13, fontWeight: 750 }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: "-0.04em", marginTop: 8 }}>{isLoading ? "..." : card.value}</div>
            </OwnerCard>
          ))}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/owner/stadiums/new" style={{ textDecoration: "none" }}><OwnerCard><b>Yangi stadion qo'shish</b><p style={{ color: "#627064", marginTop: 4 }}>Superadmin tasdig'iga yuboriladi.</p></OwnerCard></Link>
          <Link href="/owner/bookings" style={{ textDecoration: "none" }}><OwnerCard><b>Bronlarni boshqarish</b><p style={{ color: "#627064", marginTop: 4 }}>Tasdiqlash yoki bekor qilish so'rovi.</p></OwnerCard></Link>
        </div>
      </div>
    </OwnerShell>
  );
}
