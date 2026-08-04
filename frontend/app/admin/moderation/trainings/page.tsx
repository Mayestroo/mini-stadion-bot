"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { TrainingDraft } from "@/lib/types";
import { sportLabel } from "@/lib/sports";
import { AdminCard, AdminEmptyState, AdminErrorState, AdminLoading, AdminShell, AdminStatusBadge, AdminStatusFilterToggle, AdminSubTabs } from "@/components/admin/AdminShell";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { ModerationActionButtons, useModerationActions } from "@/components/admin/ModerationActions";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";
import { Dumbbell, Phone } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/trainings", label: "Mashg'ulotlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function TrainingModerationPage() {
  const isSuperadmin = useRequireSuperadmin();
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const actions = useModerationActions({
    approveFn: superadminApi.approveTrainingDraft,
    rejectFn: superadminApi.rejectTrainingDraft,
    queryKey: ["admin-training-drafts"],
  });
  const query = useQuery<TrainingDraft[]>({
    queryKey: ["admin-training-drafts", statusFilter],
    queryFn: () => superadminApi.getTrainingDrafts({ status: statusFilter === "all" ? undefined : "pending" }),
  });
  const drafts = query.data ?? [];
  const approving = drafts.find((draft) => draft.id === actions.approvingId) ?? null;

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Mashg'ulot moderatsiyasi" subtitle="Superadmin tasdig'ini kutayotgan trening so'rovlar">
      <AdminSubTabs items={moderationTabs} />
      <AdminStatusFilterToggle value={statusFilter} onChange={setStatusFilter} />
      <div style={{ display: "grid", gap: 10 }}>
        {query.isLoading ? <AdminLoading /> : query.isError ? <AdminErrorState text="Xatolik yuz berdi. Draftlarni yuklab bo'lmadi." onRetry={() => query.refetch()} /> : drafts.length === 0 ? <AdminEmptyState icon={<Dumbbell size={28} />} title="So'rovlar yo'q" text={statusFilter === "pending" ? "Tasdiq kutayotgan mashg'ulot o'zgarishlari yo'q." : "Mashg'ulot draftlari shu yerda chiqadi."} /> : drafts.map((draft) => (
          <AdminCard key={draft.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 17 }}>{draft.title}</b>
                <div style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
                  <Dumbbell size={13} /> {sportLabel(draft.sport)}{draft.coach_name ? ` · ${draft.coach_name}` : ""}
                </div>
                <div style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 3 }}>{draft.address || "Stadiyonga bog'langan"}</div>
              </div>
              <AdminStatusBadge status={draft.status} />
            </div>
            <div style={{ marginTop: 10, color: "var(--mini-muted)", fontSize: 13 }}>
              {draft.draft_type} · {[draft.schedule_text, draft.price_text].filter(Boolean).join(" · ") || "—"}
            </div>
            <div style={{ color: "var(--mini-blue)", fontWeight: 700, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Phone size={13} /> {draft.phone}{draft.telegram ? ` · ${draft.telegram}` : ""}
            </div>
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
        title="Mashg'ulot draftini tasdiqlash"
        text={approving ? `"${approving.title}" ${approving.draft_type === "create" ? "yangi mashg'ulot sifatida umumiy ro'yxatga chiqadi" : "o'zgarishlari mashg'ulotga qo'llaniladi"}.` : undefined}
        busy={actions.approve.isPending}
        onCancel={() => actions.setApprovingId(null)}
        onConfirm={() => approving && actions.approve.mutate(approving.id)}
      />
    </AdminShell>
  );
}
