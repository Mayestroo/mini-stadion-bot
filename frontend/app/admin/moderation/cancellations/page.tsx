"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { BookingCancelRequest } from "@/lib/types";
import { AdminCard, AdminEmptyState, AdminErrorState, AdminLoading, AdminShell, AdminStatusBadge, AdminStatusFilterToggle, AdminSubTabs } from "@/components/admin/AdminShell";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { ModerationActionButtons, useModerationActions } from "@/components/admin/ModerationActions";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";
import { Ban } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/trainings", label: "Mashg'ulotlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function CancellationModerationPage() {
  const isSuperadmin = useRequireSuperadmin();
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const actions = useModerationActions({
    approveFn: superadminApi.approveCancelRequest,
    rejectFn: superadminApi.rejectCancelRequest,
    queryKey: ["admin-cancel-requests"],
  });
  const query = useQuery<BookingCancelRequest[]>({
    queryKey: ["admin-cancel-requests", statusFilter],
    queryFn: () => superadminApi.getCancelRequests({ status: statusFilter === "all" ? undefined : "pending" }),
  });
  const requests = query.data ?? [];
  const approving = requests.find((request) => request.id === actions.approvingId) ?? null;

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Bekor qilish so'rovlari" subtitle="Ownerlardan kelgan cancel requestlar">
      <AdminSubTabs items={moderationTabs} />
      <AdminStatusFilterToggle value={statusFilter} onChange={setStatusFilter} />
      <div style={{ display: "grid", gap: 10 }}>
        {query.isLoading ? <AdminLoading /> : query.isError ? <AdminErrorState text="Xatolik yuz berdi. So'rovlarni yuklab bo'lmadi." onRetry={() => query.refetch()} /> : requests.length === 0 ? <AdminEmptyState icon={<Ban size={28} />} title="Cancel requestlar yo'q" text={statusFilter === "pending" ? "Tasdiq kutayotgan bekor qilish so'rovlari yo'q." : "Ownerlardan kelgan bekor qilish so'rovlari shu yerda chiqadi."} /> : requests.map((request) => (
          <AdminCard key={request.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <b style={{ fontSize: 17 }}>Bron #{request.booking_id}</b>
              <AdminStatusBadge status={request.status} />
            </div>
            <p style={{ color: "var(--mini-muted)", marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>{request.reason}</p>
            <ModerationActionButtons
              pending={request.status === "pending"}
              rejectNote={actions.rejectNote}
              rejecting={actions.rejectingId === request.id}
              busy={actions.reject.isPending}
              onApprove={() => actions.setApprovingId(request.id)}
              onToggleReject={() => actions.setRejectingId(actions.rejectingId === request.id ? null : request.id)}
              onNoteChange={actions.setRejectNote}
              onReject={() => actions.reject.mutate(request.id)}
            />
          </AdminCard>
        ))}
      </div>
      <AdminConfirmDialog
        open={approving !== null}
        danger
        title="Bekor qilish so'rovini tasdiqlash"
        text={approving ? `Bron #${approving.booking_id} bekor qilinadi va foydalanuvchiga xabar yuboriladi.` : undefined}
        busy={actions.approve.isPending}
        onCancel={() => actions.setApprovingId(null)}
        onConfirm={() => approving && actions.approve.mutate(approving.id)}
      />
    </AdminShell>
  );
}
