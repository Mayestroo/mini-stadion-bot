"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { Training } from "@/lib/types";
import { sportLabel } from "@/lib/sports";
import { Dumbbell, Phone, Star } from "lucide-react";
import { AdminButton, AdminCard, AdminEmptyState, AdminLoading, AdminShell, AdminStatusBadge } from "@/components/admin/AdminShell";

export default function AdminTrainings() {
  const queryClient = useQueryClient();
  const { data: trainings = [], isLoading, isError } = useQuery<Training[]>({
    queryKey: ["admin-trainings"],
    queryFn: superadminApi.getTrainings,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { is_active?: boolean; is_featured?: boolean } }) =>
      superadminApi.updateTraining(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-trainings"] }),
  });

  return (
    <AdminShell title="Mashg'ulotlar" subtitle={`${trainings.length} ta mashg'ulot`}>
      {isLoading ? (
        <AdminLoading />
      ) : isError ? (
        <AdminCard><p style={{ color: "var(--mini-red)", fontWeight: 700 }}>Xatolik yuz berdi. Mashg'ulotlarni yuklab bo'lmadi.</p></AdminCard>
      ) : trainings.length === 0 ? (
        <AdminEmptyState icon={<Dumbbell size={28} />} title="Mashg'ulotlar yo'q" text="Ownerlar mashg'ulot qo'shganda ular moderatsiyadan so'ng shu yerda chiqadi." />
      ) : (
        <div className="mini-list">
          {trainings.map((t) => (
            <AdminCard key={t.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 760, fontSize: 17, letterSpacing: "-0.015em" }}>
                    {t.is_featured ? <Star size={14} fill="#facc15" color="#facc15" style={{ marginRight: 5 }} /> : null}
                    {t.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--mini-muted)", marginTop: 4 }}>
                    <Dumbbell size={13} /> {sportLabel(t.sport)}{t.district ? ` · ${t.district}` : ""}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--mini-blue)", fontWeight: 700, marginTop: 6 }}>
                    <Phone size={12} /> {t.phone}
                  </div>
                </div>
                <AdminStatusBadge status={t.is_active ? "active" : "inactive"} label={t.is_active ? "Faol" : "Faol emas"} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <AdminButton tone={t.is_featured ? "dark" : "blue"} disabled={update.isPending}
                  onClick={() => update.mutate({ id: t.id, data: { is_featured: !t.is_featured } })}>
                  {t.is_featured ? "Topdan olish" : "Topga qo'shish"}
                </AdminButton>
                <AdminButton tone={t.is_active ? "red" : "green"} disabled={update.isPending}
                  onClick={() => update.mutate({ id: t.id, data: { is_active: !t.is_active } })}>
                  {t.is_active ? "O'chirish" : "Yoqish"}
                </AdminButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
