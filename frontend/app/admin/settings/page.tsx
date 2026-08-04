"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2, Wrench } from "lucide-react";
import { AdminButton, AdminCard, AdminEmptyState, AdminErrorState, AdminInput, AdminLoading, AdminShell } from "@/components/admin/AdminShell";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";
import { SettingItem, superadminApi } from "@/lib/api";

export default function AdminSettingsPage() {
  const isSuperadmin = useRequireSuperadmin();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [intervalValue, setIntervalValue] = useState<string | null>(null);
  const [maintenanceTarget, setMaintenanceTarget] = useState<boolean | null>(null);

  const query = useQuery<SettingItem[]>({ queryKey: ["admin-settings"], queryFn: superadminApi.getSettings });
  const settings = query.data ?? [];
  const maintenance = settings.find((s) => s.key === "maintenance_mode");
  const broadcastInterval = settings.find((s) => s.key === "broadcast_interval_seconds");

  const update = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => superadminApi.updateSetting(key, value),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      setIntervalValue(null);
      setMaintenanceTarget(null);
      toast.push("green", `"${updated.key}" sozlamasi saqlandi`);
    },
    onError: (error: any) => {
      setMaintenanceTarget(null);
      toast.push("red", error.response?.data?.detail || "Sozlamani saqlab bo'lmadi");
    },
  });

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Sozlamalar" subtitle="Platformani ish vaqtida boshqarish">
      {query.isLoading ? (
        <AdminLoading />
      ) : query.isError ? (
        <AdminErrorState text="Sozlamalarni yuklab bo'lmadi." onRetry={() => query.refetch()} />
      ) : settings.length === 0 ? (
        <AdminEmptyState icon={<Settings2 size={28} />} title="Sozlamalar yo'q" text="Boshqaruv sozlamalari shu yerda ko'rinadi." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {maintenance ? (
            <AdminCard>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div className={`mini-glyph ${maintenance.value === "true" ? "mini-glyph-orange" : ""}`} style={{ width: 42, height: 42, flexShrink: 0 }}><Wrench size={20} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>Texnik ishlar rejimi</b>
                  <p style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 4 }}>{maintenance.description}</p>
                  <p style={{ fontSize: 13, marginTop: 6, fontWeight: 700, color: maintenance.value === "true" ? "var(--mini-orange)" : "var(--mini-green)" }}>
                    Hozир: {maintenance.value === "true" ? "Yoqilgan — oddiy foydalanuvchilarga 503" : "O'chirilgan — hamma ishlaydi"}
                  </p>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <AdminButton tone={maintenance.value === "true" ? "green" : "red"} onClick={() => setMaintenanceTarget(maintenance.value !== "true")}>
                  {maintenance.value === "true" ? "Rejimni o'chirish" : "Rejimni yoqish"}
                </AdminButton>
              </div>
            </AdminCard>
          ) : null}

          {broadcastInterval ? (
            <AdminCard>
              <b>Broadcast oraliq vaqti (soniya)</b>
              <p style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 4 }}>{broadcastInterval.description}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <AdminInput
                  type="number"
                  min={0}
                  value={intervalValue ?? broadcastInterval.value}
                  onChange={(e) => setIntervalValue(e.target.value)}
                />
                <AdminButton
                  disabled={intervalValue === null || intervalValue === broadcastInterval.value || update.isPending}
                  onClick={() => intervalValue !== null && update.mutate({ key: "broadcast_interval_seconds", value: intervalValue })}
                >
                  Saqlash
                </AdminButton>
              </div>
            </AdminCard>
          ) : null}
        </div>
      )}

      <AdminConfirmDialog
        open={maintenanceTarget !== null}
        danger={maintenanceTarget === true}
        title={maintenanceTarget ? "Texnik ishlar rejimini yoqish" : "Texnik ishlar rejimini o'chirish"}
        text={maintenanceTarget
          ? "Oddiy foydalanuvchilar va ownerlar uchun barcha API so'rovlar 503 qaytaradi. Faqat admin panel va bot xizmati ishlaydi."
          : "Platforma barcha foydalanuvchilar uchun qayta ochiladi."}
        busy={update.isPending}
        onCancel={() => setMaintenanceTarget(null)}
        onConfirm={() => maintenanceTarget !== null && update.mutate({ key: "maintenance_mode", value: maintenanceTarget ? "true" : "false" })}
      />
    </AdminShell>
  );
}
