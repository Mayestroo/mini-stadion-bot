"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { BookingCancelRequest } from "@/lib/types";
import { AdminButton, AdminCard, AdminEmptyState, AdminLoading, AdminShell, AdminStatusBadge, AdminSubTabs } from "@/components/admin/AdminShell";
import { Ban } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function CancellationModerationPage() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({ queryKey: ["admin-cancel-requests"], queryFn: superadminApi.getCancelRequests });
  const approve = useMutation({ mutationFn: (id: number) => superadminApi.approveCancelRequest(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-cancel-requests"] }) });
  const reject = useMutation({ mutationFn: (id: number) => superadminApi.rejectCancelRequest(id, "Rad etildi"), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-cancel-requests"] }) });
  return <AdminShell title="Bekor qilish so'rovlari" subtitle="Ownerlardan kelgan cancel requestlar"><AdminSubTabs items={moderationTabs} /><div style={{ display: "grid", gap: 10 }}>{isLoading ? <AdminLoading /> : requests.length === 0 ? <AdminEmptyState icon={<Ban size={28} />} title="Cancel requestlar yo'q" text="Ownerlardan kelgan bekor qilish so'rovlari shu yerda chiqadi." /> : requests.map((request: BookingCancelRequest) => <AdminCard key={request.id}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}><b style={{ fontSize: 17 }}>Bron #{request.booking_id}</b><AdminStatusBadge status={request.status} /></div><p style={{ color: "var(--mini-muted)", marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>{request.reason}</p>{request.status === "pending" ? <div style={{ display: "flex", gap: 8, marginTop: 12 }}><AdminButton onClick={() => approve.mutate(request.id)}>Approve</AdminButton><AdminButton tone="red" onClick={() => reject.mutate(request.id)}>Reject</AdminButton></div> : null}</AdminCard>)}</div></AdminShell>;
}
