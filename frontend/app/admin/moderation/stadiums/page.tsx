"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { StadiumDraft } from "@/lib/types";
import { AdminButton, AdminCard, AdminEmptyState, AdminLoading, AdminShell, AdminStatusBadge, AdminSubTabs } from "@/components/admin/AdminShell";
import { MapPinned, Warehouse } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function StadiumModerationPage() {
  const queryClient = useQueryClient();
  const { data: drafts = [], isLoading } = useQuery({ queryKey: ["admin-stadium-drafts"], queryFn: superadminApi.getStadiumDrafts });
  const approve = useMutation({ mutationFn: (id: number) => superadminApi.approveStadiumDraft(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-stadium-drafts"] }) });
  const reject = useMutation({ mutationFn: (id: number) => superadminApi.rejectStadiumDraft(id, "Rad etildi"), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-stadium-drafts"] }) });
  return (
    <ModerationLayout title="Stadion moderatsiyasi">
      {isLoading ? <AdminLoading /> : drafts.length === 0 ? <AdminEmptyState icon={<Warehouse size={28} />} title="So'rovlar yo'q" text="Tasdiq kutayotgan stadion o'zgarishlari shu yerda chiqadi." /> : drafts.map((draft: StadiumDraft) => (
        <AdminCard key={draft.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}><b style={{ fontSize: 17 }}>{draft.name}</b><div style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><MapPinned size={13} /> {draft.address}</div></div>
            <AdminStatusBadge status={draft.status} />
          </div>
          <div style={{ marginTop: 10, color: "var(--mini-muted)", fontSize: 13 }}>{draft.draft_type} · {draft.open_time}-{draft.close_time}</div>
          <div style={{ color: "var(--mini-green)", fontWeight: 780, marginTop: 6 }}>{draft.price_per_hour?.toLocaleString("uz-UZ")} so'm/soat</div>
          {draft.status === "pending" ? <Actions onApprove={() => approve.mutate(draft.id)} onReject={() => reject.mutate(draft.id)} /> : null}
        </AdminCard>
      ))}
    </ModerationLayout>
  );
}

function ModerationLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return <AdminShell title={title} subtitle="Superadmin tasdig'ini kutayotgan so'rovlar"><AdminSubTabs items={moderationTabs} /><div style={{ display: "grid", gap: 10 }}>{children}</div></AdminShell>;
}

function Actions({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) { return <div style={{ display: "flex", gap: 8, marginTop: 12 }}><AdminButton onClick={onApprove}>Approve</AdminButton><AdminButton tone="red" onClick={onReject}>Reject</AdminButton></div>; }
