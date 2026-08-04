"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { TrainingDraft } from "@/lib/types";
import { sportLabel } from "@/lib/sports";
import { AdminButton, AdminCard, AdminEmptyState, AdminInput, AdminLoading, AdminShell, AdminStatusBadge, AdminSubTabs } from "@/components/admin/AdminShell";
import { Dumbbell, Phone } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/trainings", label: "Mashg'ulotlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function TrainingModerationPage() {
  const queryClient = useQueryClient();
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const { data: drafts = [], isLoading, isError } = useQuery<TrainingDraft[]>({ queryKey: ["admin-training-drafts"], queryFn: superadminApi.getTrainingDrafts });
  const approve = useMutation({ mutationFn: (id: number) => superadminApi.approveTrainingDraft(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-training-drafts"] }) });
  const reject = useMutation({ mutationFn: (id: number) => superadminApi.rejectTrainingDraft(id, rejectNote || "Rad etildi"), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-training-drafts"] }); setRejectingId(null); setRejectNote(""); } });

  return (
    <AdminShell title="Mashg'ulot moderatsiyasi" subtitle="Superadmin tasdig'ini kutayotgan trening so'rovlar">
      <AdminSubTabs items={moderationTabs} />
      <div style={{ display: "grid", gap: 10 }}>
        {isLoading ? <AdminLoading /> : isError ? <AdminCard><p style={{ color: "var(--mini-red)", fontWeight: 700 }}>Xatolik yuz berdi. Draftlarni yuklab bo'lmadi.</p></AdminCard> : drafts.length === 0 ? <AdminEmptyState icon={<Dumbbell size={28} />} title="So'rovlar yo'q" text="Tasdiq kutayotgan mashg'ulot o'zgarishlari shu yerda chiqadi." /> : drafts.map((draft) => (
          <AdminCard key={draft.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
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
            {draft.status === "pending" ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <AdminButton onClick={() => approve.mutate(draft.id)}>Approve</AdminButton>
                  <AdminButton tone="red" onClick={() => setRejectingId(rejectingId === draft.id ? null : draft.id)}>
                    {rejectingId === draft.id ? "Bekor qilish" : "Reject"}
                  </AdminButton>
                </div>
                {rejectingId === draft.id ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <AdminInput placeholder="Rad etish sababi" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} maxLength={500} />
                    <AdminButton tone="red" onClick={() => reject.mutate(draft.id)}>Tasdiqlash</AdminButton>
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
