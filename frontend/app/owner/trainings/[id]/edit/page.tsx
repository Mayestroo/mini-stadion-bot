"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { Training } from "@/lib/types";
import { OwnerButton, OwnerCard, OwnerShell } from "@/components/owner/OwnerShell";
import { TrainingFormFields, TrainingFormState, trainingFormToPayload } from "@/components/owner/TrainingForm";

export default function EditTrainingPage() {
  const router = useRouter();
  const params = useParams();
  const trainingId = Number(params.id);
  const [form, setForm] = useState<TrainingFormState | null>(null);

  const { data: trainings = [], isLoading } = useQuery<Training[]>({
    queryKey: ["owner-trainings"],
    queryFn: ownerApi.getTrainings,
  });

  const training = trainings.find((t) => t.id === trainingId);

  useEffect(() => {
    if (training && !form) {
      setForm({
        title: training.title,
        sport: training.sport,
        coach_name: training.coach_name || "",
        schedule_text: training.schedule_text || "",
        price_text: training.price_text || "",
        age_group: training.age_group || "",
        stadium_id: training.stadium_id ? String(training.stadium_id) : "",
        address: training.address || "",
        district: training.district || "",
        phone: training.phone || "",
        telegram: training.telegram || "",
        instagram: training.instagram || "",
        description: training.description || "",
      });
    }
  }, [training, form]);

  const mutation = useMutation({
    mutationFn: () => ownerApi.createTrainingUpdateDraft(trainingId, trainingFormToPayload(form!)),
    onSuccess: () => router.push("/owner/trainings"),
  });

  function onChange(field: keyof TrainingFormState, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  return (
    <OwnerShell>
      <OwnerCard>
        <h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Mashg'ulotni tahrirlash</h2>
        <p style={{ color: "#627064", marginTop: 6, marginBottom: 16 }}>O'zgarishlar superadmin tasdig'idan keyin public bo'ladi. Tasdiqlanmaguncha eski ma'lumotlar ko'rinadi.</p>
        {isLoading || !form ? (
          <div className="mini-loader mini-loader-sm"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div>
        ) : (
          <>
            {mutation.error ? (
              <div style={{ color: "#ff3b30", marginBottom: 12 }}>
                {formatApiError(mutation.error) || "Xatolik"}
              </div>
            ) : null}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              style={{ display: "grid", gap: 12 }}
            >
              <TrainingFormFields form={form} onChange={onChange} />
              <OwnerButton type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Yuborilmoqda..." : "Moderatsiyaga yuborish"}
              </OwnerButton>
            </form>
          </>
        )}
      </OwnerCard>
    </OwnerShell>
  );
}

function formatApiError(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => (typeof item?.msg === "string" ? item.msg.replace(/^Value error,\s*/i, "") : "Xatolik")).join(". ");
  }
  return "";
}
