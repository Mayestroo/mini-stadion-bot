"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { stadiumApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { MapPinned, Plus, Warehouse } from "lucide-react";
import { AdminCard, AdminEmptyState, AdminLoading, AdminShell, AdminStatusBadge } from "@/components/admin/AdminShell";

export default function AdminStadiums() {
  const { data: stadiums = [], isLoading } = useQuery({
    queryKey: ["admin-stadiums"],
    queryFn: () => stadiumApi.getAll({ limit: 100 }),
  });

  return (
    <AdminShell title="Stadionlar" subtitle={`${stadiums.length} ta stadion`}>
        <div style={{ marginBottom: 14 }}>
          <Link
            href="/admin/stadionlar/yangi"
            className="mini-pressable"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px 16px", borderRadius: 17, background: "linear-gradient(180deg, #38d46a 0%, #30b95b 100%)", color: "white", textDecoration: "none", fontWeight: 750, fontSize: 15, boxShadow: "0 12px 22px rgba(52, 199, 89, 0.22)" }}
          >
            <Plus size={16} />
            Yangi stadion
          </Link>
        </div>

        {isLoading ? (
          <AdminLoading />
        ) : stadiums.length === 0 ? (
          <AdminEmptyState icon={<Warehouse size={28} />} title="Stadionlar yo'q" text="Birinchi stadionni qo'shish uchun yuqoridagi tugmadan foydalaning." />
        ) : (
          <div className="mini-list">
            {stadiums.map((s: any) => (
              <AdminCard key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 760, fontSize: 17, letterSpacing: "-0.015em" }}>{s.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--mini-muted)", marginTop: 4 }}><MapPinned size={13} /> {s.address}</div>
                    <div style={{ color: "var(--mini-green)", fontWeight: 760, fontSize: 14, marginTop: 7 }}>{formatPrice(s.price_per_hour)}/soat</div>
                  </div>
                  <AdminStatusBadge status={s.is_active ? "active" : "inactive"} label={s.is_active ? "Faol" : "Faol emas"} />
                </div>
              </AdminCard>
            ))}
          </div>
        )}
    </AdminShell>
  );
}
