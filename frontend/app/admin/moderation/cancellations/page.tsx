"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { BookingCancelRequest } from "@/lib/types";
import { AdminButton, AdminCard, AdminEmptyState, AdminInput, AdminLoading, AdminShell, AdminStatusBadge, AdminSubTabs } from "@/components/admin/AdminShell";
import { Ban } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/trainings", label: "Mashg'ulotlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function CancellationModerationPage() {
  const queryClient = useQueryClient();
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const { data: requests = [], isLoading, isError } = useQuery({ queryKey: ["admin-cancel-requests"], queryFn: superadminApi.getCancelRequests });
  const approve = useMutation({ mutationFn: (id: number) => superadminApi.approveCancelRequest(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-cancel-requests"] }) });
  const reject = useMutation({ mutationFn: (id: number) => superadminApi.rejectCancelRequest(id, rejectNote || "Rad etildi"), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-cancel-requests"] }); setRejectingId(null); setRejectNote(""); } });

  return (
    <AdminShell title="Bekor qilish so'rovlari" subtitle="Ownerlardan kelgan cancel requestlar">
      <AdminSubTabs items={moderationTabs} />
      <div style={{ display: "grid", gap: 10 }}>
        {isLoading ? <AdminLoading /> : isError ? <AdminCard><p style={{ color: "var(--mini-red)", fontWeight: 700 }}>Xatolik yuz berdi. So'rovlarni yuklab bo'lmadi.</p></AdminCard> : requests.length === 0 ? <AdminEmptyState icon={<Ban size={28} />} title="Cancel requestlar yo'q" text="Ownerlardan kelgan bekor qilish so'rovlari shu yerda chiqadi." /> : requests.map((request: BookingCancelRequest) => (
          <AdminCard key={request.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <b style={{ fontSize: 17 }}>Bron #{request.booking_id}</b>
              <AdminStatusBadge status={request.status} />
            </div>
            <p style={{ color: "var(--mini-muted)", marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>{request.reason}</p>
            {request.status === "pending" ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <AdminButton onClick={() => approve.mutate(request.id)}>Approve</AdminButton>
                  <AdminButton tone="red" onClick={() => setRejectingId(rejectingId === request.id ? null : request.id)}>
                    {rejectingId === request.id ? "Bekor qilish" : "Reject"}
                  </AdminButton>
                </div>
                {rejectingId === request.id ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <AdminInput placeholder="Rad etish sababi" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} maxLength={500} />
                    <AdminButton tone="red" onClick={() => reject.mutate(request.id)}>Tasdiqlash</AdminButton>
                  </div>
                ) : null}
              </div>
            ) : null}
          </AdminCard>
        ))}
      </div>
    </AdminShell>
  );
}
