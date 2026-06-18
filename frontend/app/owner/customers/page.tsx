"use client";

import { useQuery } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { User } from "@/lib/types";
import { OwnerCard, OwnerShell } from "@/components/owner/OwnerShell";

export default function OwnerCustomersPage() {
  const { data: customers = [], isLoading } = useQuery({ queryKey: ["owner-customers"], queryFn: ownerApi.getCustomers });
  return (
    <OwnerShell>
      <div style={{ display: "grid", gap: 10 }}>
        <OwnerCard><h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Mijozlar</h2><p style={{ color: "#627064", marginTop: 4 }}>Stadionlaringizni bron qilgan foydalanuvchilar.</p></OwnerCard>
        {isLoading ? <OwnerCard>Yuklanmoqda...</OwnerCard> : customers.map((customer: User) => <OwnerCard key={customer.id}><b>{customer.full_name}</b><div style={{ color: "#627064", fontSize: 14 }}>{customer.phone || customer.telegram_id || "Aloqa yo'q"}</div></OwnerCard>)}
      </div>
    </OwnerShell>
  );
}
