"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { Training, TrainingDraft } from "@/lib/types";
import { sportLabel } from "@/lib/sports";
import { OwnerButton, OwnerCard, OwnerShell } from "@/components/owner/OwnerShell";
import { Plus } from "lucide-react";

export default function OwnerTrainingsPage() {
  const queryClient = useQueryClient();
  const { data: trainings = [], isLoading } = useQuery<Training[]>({ queryKey: ["owner-trainings"], queryFn: ownerApi.getTrainings });
  const { data: drafts = [] } = useQuery<TrainingDraft[]>({ queryKey: ["owner-training-drafts"], queryFn: ownerApi.getTrainingDrafts });

  const toggleActive = useMutation({
    mutationFn: (training: Training) => (training.is_active ? ownerApi.deactivateTraining(training.id) : ownerApi.activateTraining(training.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-trainings"] }),
  });

  const pendingDrafts = drafts.filter((d) => d.status === "pending" || d.status === "rejected");

  return (
    <OwnerShell>
      <div style={{ display: "grid", gap: 12 }}>
        <OwnerCard>
          <h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Mashg'ulotlarim</h2>
          <p style={{ color: "#627064", marginTop: 4 }}>Sport treninglari ro'yxati. Foydalanuvchilar to'g'ridan-to'g'ri bog'lanadi.</p>
        </OwnerCard>

        <Link href="/owner/trainings/new" style={{ textDecoration: "none" }}>
          <div className="mini-pressable" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px 16px", borderRadius: 17, background: "linear-gradient(180deg, #38d46a 0%, #30b95b 100%)", color: "white", fontWeight: 750, fontSize: 15, boxShadow: "0 12px 22px rgba(52,199,89,0.22)" }}>
            <Plus size={16} />
            Yangi mashg'ulot
          </div>
        </Link>

        {isLoading ? (
          <div className="mini-loader mini-loader-sm"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div>
        ) : trainings.length === 0 ? (
          <OwnerCard>Hozircha mashg'ulot yo'q. Birinchi mashg'ulotingizni qo'shing.</OwnerCard>
        ) : (
          trainings.map((training) => (
            <OwnerCard key={training.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <b style={{ fontSize: 17 }}>{training.title}</b>
                  <div style={{ color: "#627064", fontSize: 13, marginTop: 4 }}>
                    {sportLabel(training.sport)}{training.schedule_text ? ` · ${training.schedule_text}` : ""}
                  </div>
                  <div style={{ color: "#627064", fontSize: 13, marginTop: 2 }}>{training.address}</div>
                </div>
                <StatusBadge status={training.is_active ? "active" : "inactive"} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Link href={`/owner/trainings/${training.id}/edit`} style={{ flex: 1, textDecoration: "none" }}>
                  <div className="mini-pressable" style={{ borderRadius: 16, padding: "12px 15px", background: "#102015", color: "white", fontSize: 14, fontWeight: 850, textAlign: "center" }}>Tahrirlash</div>
                </Link>
                <OwnerButton tone={training.is_active ? "red" : "green"} onClick={() => toggleActive.mutate(training)} disabled={toggleActive.isPending}>
                  {training.is_active ? "To'xtatish" : "Faollashtirish"}
                </OwnerButton>
              </div>
            </OwnerCard>
          ))
        )}

        {pendingDrafts.length > 0 ? (
          <>
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: "#627064", textTransform: "uppercase", letterSpacing: "0.08em" }}>Moderatsiya statuslari</div>
            {pendingDrafts.map((draft) => (
              <OwnerCard key={draft.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <b>{draft.title}</b>
                    <div style={{ color: "#627064", fontSize: 13 }}>{draft.draft_type === "create" ? "Yangi mashg'ulot" : "Tahrirlash"}</div>
                  </div>
                  <StatusBadge status={draft.status} />
                </div>
                {draft.review_note ? (
                  <p style={{ marginTop: 10, color: draft.status === "rejected" ? "#d82d24" : "#627064", fontSize: 14 }}>Izoh: {draft.review_note}</p>
                ) : null}
              </OwnerCard>
            ))}
          </>
        ) : null}
      </div>
    </OwnerShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { active: "Faol", inactive: "To'xtatilgan", pending: "Kutilmoqda", approved: "Tasdiqlangan", rejected: "Rad etilgan", draft: "Qoralama" };
  const color = status === "active" || status === "approved" ? "#19a850" : status === "rejected" || status === "inactive" ? "#d82d24" : "#c97800";
  return <span style={{ padding: "5px 10px", borderRadius: 999, background: `${color}1f`, color, fontSize: 12, fontWeight: 850, whiteSpace: "nowrap" }}>{labels[status] || status}</span>;
}
