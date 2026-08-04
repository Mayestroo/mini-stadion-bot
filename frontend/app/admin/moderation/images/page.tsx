"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { ImageDraft } from "@/lib/types";
import { getImageUrl } from "@/lib/api";
import { AdminCard, AdminEmptyState, AdminErrorState, AdminLoading, AdminShell, AdminStatusBadge, AdminStatusFilterToggle, AdminSubTabs } from "@/components/admin/AdminShell";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { ModerationActionButtons, useModerationActions } from "@/components/admin/ModerationActions";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";
import { Image as ImageIcon } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/trainings", label: "Mashg'ulotlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function ImageModerationPage() {
  const isSuperadmin = useRequireSuperadmin();
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const actions = useModerationActions({
    approveFn: superadminApi.approveImageDraft,
    rejectFn: superadminApi.rejectImageDraft,
    queryKey: ["admin-image-drafts"],
  });
  const query = useQuery<ImageDraft[]>({
    queryKey: ["admin-image-drafts", statusFilter],
    queryFn: () => superadminApi.getImageDrafts({ status: statusFilter === "all" ? undefined : "pending" }),
  });
  const drafts = query.data ?? [];
  const approving = drafts.find((draft) => draft.id === actions.approvingId) ?? null;

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Rasm moderatsiyasi" subtitle="Rasm o'zgarishlarini tasdiqlash">
      <AdminSubTabs items={moderationTabs} />
      <AdminStatusFilterToggle value={statusFilter} onChange={setStatusFilter} />
      <div style={{ display: "grid", gap: 10 }}>
        {query.isLoading ? <AdminLoading /> : query.isError ? <AdminErrorState text="Xatolik yuz berdi. Rasm draftlarini yuklab bo'lmadi." onRetry={() => query.refetch()} /> : drafts.length === 0 ? <AdminEmptyState icon={<ImageIcon size={28} />} title="Rasm so'rovlari yo'q" text={statusFilter === "pending" ? "Tasdiq kutayotgan rasm o'zgarishlari yo'q." : "Rasm draftlari shu yerda chiqadi."} /> : drafts.map((draft) => (
          <AdminCard key={draft.id}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <img src={getImageUrl(draft.image_url)} alt="Draft" style={{ width: 112, height: 84, objectFit: "cover", borderRadius: 16, border: "1px solid var(--mini-line)" }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <b style={{ fontSize: 16 }}>{draft.action}</b>
                  <AdminStatusBadge status={draft.status} />
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
              </div>
            </div>
          </AdminCard>
        ))}
      </div>
      <AdminConfirmDialog
        open={approving !== null}
        danger={approving?.action === "delete"}
        title="Rasm o'zgarishini tasdiqlash"
        text={approving ? (approving.action === "delete" ? "Rasm stadion galereyasidan o'chiriladi." : "Rasm o'zgarishi stadion sahifasiga qo'llaniladi.") : undefined}
        busy={actions.approve.isPending}
        onCancel={() => actions.setApprovingId(null)}
        onConfirm={() => approving && actions.approve.mutate(approving.id)}
      />
    </AdminShell>
  );
}
