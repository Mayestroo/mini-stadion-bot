"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { OwnerButton, OwnerCard, OwnerShell } from "@/components/owner/OwnerShell";
import { emptyTrainingForm, TrainingFormFields, trainingFormToPayload } from "@/components/owner/TrainingForm";

export default function NewTrainingPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyTrainingForm);
  const mutation = useMutation({
    mutationFn: () => ownerApi.createTrainingDraft(trainingFormToPayload(form)),
    onSuccess: () => router.push("/owner/trainings"),
  });

  function onChange(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <OwnerShell>
      <OwnerCard>
        <h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Yangi mashg'ulot</h2>
        <p style={{ color: "#627064", marginTop: 6, marginBottom: 16 }}>
          Ma'lumotlar superadmin tasdig'idan keyin public bo'ladi. Foydalanuvchilar siz bilan ko'rsatilgan telefon yoki ijtimoiy tarmoq orqali bog'lanadi.
        </p>
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
