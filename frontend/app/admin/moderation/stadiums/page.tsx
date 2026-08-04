"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { StadiumDraft } from "@/lib/types";
import { AdminCard, AdminEmptyState, AdminErrorState, AdminLoading, AdminShell, AdminStatusBadge, AdminStatusFilterToggle, AdminSubTabs } from "@/components/admin/AdminShell";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { ModerationActionButtons, useModerationActions } from "@/components/admin/ModerationActions";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";
import { MapPinned, Warehouse } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/trainings", label: "Mashg'ulotlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function StadiumModerationPage() {
  const isSuperadmin = useRequireSuperadmin();
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const actions = useModerationActions({
    approveFn: superadminApi.approveStadiumDraft,
    rejectFn: superadminApi.rejectStadiumDraft,
    queryKey: ["admin-stadium-drafts"],
  });
  const query = useQuery<StadiumDraft[]>({
    queryKey: ["admin-stadium-drafts", statusFilter],
    queryFn: () => superadminApi.getStadiumDrafts({ status: statusFilter === "all" ? undefined : "pending" }),
  });
  const drafts = query.data ?? [];
  const approving = drafts.find((draft) => draft.id === actions.approvingId) ?? null;

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Stadion moderatsiyasi" subtitle="Superadmin tasdig'ini kutayotgan so'rovlar">
      <AdminSubTabs items={moderationTabs} />
      <AdminStatusFilterToggle value={statusFilter} onChange={setStatusFilter} />
      <div style={{ display: "grid", gap: 10 }}>
        {query.isLoading ? <AdminLoading /> : query.isError ? <AdminErrorState text="Xatolik yuz berdi. Draftlarni yuklab bo'lmadi." onRetry={() => query.refetch()} /> : drafts.length === 0 ? <AdminEmptyState icon={<Warehouse size={28} />} title="So'rovlar yo'q" text={statusFilter === "pending" ? "Tasdiq kutayotgan stadion o'zgarishlari yo'q." : "Stadion draftlari shu yerda chiqadi."} /> : drafts.map((draft) => (
          <AdminCard key={draft.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}><b style={{ fontSize: 17 }}>{draft.name}</b><div style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><MapPinned size={13} /> {draft.address}</div></div>
              <AdminStatusBadge status={draft.status} />
            </div>
            <div style={{ marginTop: 10, color: "var(--mini-muted)", fontSize: 13 }}>{draft.draft_type} · {draft.open_time}-{draft.close_time}</div>
            <div style={{ color: "var(--mini-green)", fontWeight: 780, marginTop: 6 }}>{draft.price_per_hour?.toLocaleString("uz-UZ")} so'm/soat</div>
            <ModerationActionButtons
              pending={draft.status === "pending"}
              rejectNote={actions.rejectNote}
              rejecting={actions.rejectingId === draft.id}
              busy={actions.reject.isPending}
              onApprove={() => actions.setApprovingId(draft.id)}
              onToggleReject={() => actions.setRejectingId(actions.rejectingId === draft.id ? null : draft.id)}
              onNoteChange={actions.setRejectNote}
              onReject={() => actions.reject.mutate(draft.id)}
            />
          </AdminCard>
        ))}
      </div>
      <AdminConfirmDialog
        open={approving !== null}
        danger={false}
        title="Stadion draftini tasdiqlash"
        text={approving ? `"${approving.name}" ${approving.draft_type === "create" ? "yangi stadion sifatida public ro'yxatga qo'shiladi" : "o'zgarishlari stadionga qo'llaniladi"}.` : undefined}
        busy={actions.approve.isPending}
        onCancel={() => actions.setApprovingId(null)}
        onConfirm={() => approving && actions.approve.mutate(approving.id)}
      />
    </AdminShell>
  );
}
