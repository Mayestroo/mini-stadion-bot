"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { OwnerButton, OwnerCard, OwnerInput, OwnerShell } from "@/components/owner/OwnerShell";

export default function NewOwnerStadiumPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", address: "", phone: "", price_per_hour: "", open_time: "08:00", close_time: "23:00", description: "" });
  const mutation = useMutation({
    mutationFn: () => ownerApi.createDraft({ ...form, price_per_hour: Number(form.price_per_hour), working_days: [0, 1, 2, 3, 4, 5, 6] }),
    onSuccess: () => router.push("/owner/moderation"),
  });

  function setField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <OwnerShell>
      <OwnerCard>
        <h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Yangi stadion</h2>
        <p style={{ color: "#627064", marginTop: 6, marginBottom: 16 }}>Ma'lumotlar superadmin tasdig'idan keyin public bo'ladi.</p>
        {mutation.error ? <div style={{ color: "#ff3b30", marginBottom: 12 }}>{(mutation.error as any).response?.data?.detail || "Xatolik"}</div> : null}
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} style={{ display: "grid", gap: 12 }}>
          <OwnerInput placeholder="Stadion nomi" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
          <OwnerInput placeholder="Manzil" value={form.address} onChange={(e) => setField("address", e.target.value)} required />
          <OwnerInput placeholder="Telefon" value={form.phone} onChange={(e) => setField("phone", e.target.value)} required />
          <OwnerInput placeholder="Soatlik narx" type="number" value={form.price_per_hour} onChange={(e) => setField("price_per_hour", e.target.value)} required />
          <div className="mini-responsive-grid-2">
            <OwnerInput type="time" value={form.open_time} onChange={(e) => setField("open_time", e.target.value)} />
            <OwnerInput type="time" value={form.close_time} onChange={(e) => setField("close_time", e.target.value)} />
          </div>
          <OwnerInput placeholder="Qisqa izoh" value={form.description} onChange={(e) => setField("description", e.target.value)} />
          <OwnerButton type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Yuborilmoqda..." : "Moderatsiyaga yuborish"}</OwnerButton>
        </form>
      </OwnerCard>
    </OwnerShell>
  );
}
