"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { ImageDraft } from "@/lib/types";
import { getImageUrl } from "@/lib/api";
import { AdminButton, AdminCard, AdminEmptyState, AdminInput, AdminLoading, AdminShell, AdminStatusBadge, AdminSubTabs } from "@/components/admin/AdminShell";
import { Image as ImageIcon } from "lucide-react";

const moderationTabs = [
  { href: "/admin/moderation/stadiums", label: "Stadionlar" },
  { href: "/admin/moderation/trainings", label: "Mashg'ulotlar" },
  { href: "/admin/moderation/images", label: "Rasmlar" },
  { href: "/admin/moderation/cancellations", label: "Bekor qilish" },
];

export default function ImageModerationPage() {
  const queryClient = useQueryClient();
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const { data: drafts = [], isLoading, isError } = useQuery({ queryKey: ["admin-image-drafts"], queryFn: superadminApi.getImageDrafts });
  const approve = useMutation({ mutationFn: (id: number) => superadminApi.approveImageDraft(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-image-drafts"] }) });
  const reject = useMutation({ mutationFn: (id: number) => superadminApi.rejectImageDraft(id, rejectNote || "Rad etildi"), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-image-drafts"] }); setRejectingId(null); setRejectNote(""); } });

  return (
    <AdminShell title="Rasm moderatsiyasi" subtitle="Rasm o'zgarishlarini tasdiqlash">
      <AdminSubTabs items={moderationTabs} />
      <div style={{ display: "grid", gap: 10 }}>
        {isLoading ? <AdminLoading /> : isError ? <AdminCard><p style={{ color: "var(--mini-red)", fontWeight: 700 }}>Xatolik yuz berdi. Rasm draftlarini yuklab bo'lmadi.</p></AdminCard> : drafts.length === 0 ? <AdminEmptyState icon={<ImageIcon size={28} />} title="Rasm so'rovlari yo'q" text="Tasdiq kutayotgan rasm o'zgarishlari shu yerda chiqadi." /> : drafts.map((draft: ImageDraft) => (
          <AdminCard key={draft.id}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <img src={getImageUrl(draft.image_url)} alt="Draft" style={{ width: 112, height: 84, objectFit: "cover", borderRadius: 16, border: "1px solid var(--mini-line)" }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <b style={{ fontSize: 16 }}>{draft.action}</b>
                  <AdminStatusBadge status={draft.status} />
                </div>
                {draft.status === "pending" ? (
                  <div style={{ marginTop: 10 }}>
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
              </div>
            </div>
          </AdminCard>
        ))}
      </div>
    </AdminShell>
  );
}
