"use client";

import { useQuery } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { AGE_GROUPS, SPORTS } from "@/lib/sports";
import { OwnerInput } from "@/components/owner/OwnerShell";

export interface TrainingFormState {
  title: string;
  sport: string;
  coach_name: string;
  schedule_text: string;
  price_text: string;
  age_group: string;
  stadium_id: string;
  address: string;
  district: string;
  phone: string;
  telegram: string;
  instagram: string;
  description: string;
}

export const emptyTrainingForm: TrainingFormState = {
  title: "",
  sport: "football",
  coach_name: "",
  schedule_text: "",
  price_text: "",
  age_group: "",
  stadium_id: "",
  address: "",
  district: "",
  phone: "",
  telegram: "",
  instagram: "",
  description: "",
};

export function trainingFormToPayload(form: TrainingFormState) {
  return {
    title: form.title,
    sport: form.sport,
    coach_name: form.coach_name || undefined,
    schedule_text: form.schedule_text || undefined,
    price_text: form.price_text || undefined,
    age_group: form.age_group || undefined,
    stadium_id: form.stadium_id ? Number(form.stadium_id) : undefined,
    address: form.stadium_id ? undefined : form.address || undefined,
    district: form.stadium_id ? undefined : form.district || undefined,
    phone: form.phone,
    telegram: form.telegram || undefined,
    instagram: form.instagram || undefined,
    description: form.description || undefined,
  };
}

export function TrainingFormFields({ form, onChange }: { form: TrainingFormState; onChange: (field: keyof TrainingFormState, value: string) => void }) {
  const { data: stadiums = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["owner-stadiums"],
    queryFn: ownerApi.getStadiums,
  });

  return (
    <>
      <OwnerInput placeholder="Mashg'ulot nomi *" value={form.title} onChange={(e) => onChange("title", e.target.value)} required />

      <label style={labelStyle}>
        Sport turi *
        <select value={form.sport} onChange={(e) => onChange("sport", e.target.value)} style={selectStyle} required>
          {SPORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <OwnerInput placeholder="Murabbiy ismi" value={form.coach_name} onChange={(e) => onChange("coach_name", e.target.value)} />
      <OwnerInput placeholder="Jadval (masalan: Du-Chor-Jum 18:00-19:30)" value={form.schedule_text} onChange={(e) => onChange("schedule_text", e.target.value)} />
      <OwnerInput placeholder="Narx (masalan: 300 000 so'm/oy)" value={form.price_text} onChange={(e) => onChange("price_text", e.target.value)} />

      <label style={labelStyle}>
        Yosh guruhi
        <select value={form.age_group} onChange={(e) => onChange("age_group", e.target.value)} style={selectStyle}>
          <option value="">Tanlanmagan</option>
          {AGE_GROUPS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        O'tkaziladigan joy
        <select value={form.stadium_id} onChange={(e) => onChange("stadium_id", e.target.value)} style={selectStyle}>
          <option value="">Boshqa joy (manzilni yozing)</option>
          {stadiums.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
      </label>

      {!form.stadium_id ? (
        <>
          <OwnerInput placeholder="Manzil *" value={form.address} onChange={(e) => onChange("address", e.target.value)} required />
          <OwnerInput placeholder="Tuman" value={form.district} onChange={(e) => onChange("district", e.target.value)} />
        </>
      ) : null}

      <OwnerInput placeholder="Telefon *" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} required />
      <OwnerInput placeholder="Telegram (@username)" value={form.telegram} onChange={(e) => onChange("telegram", e.target.value)} />
      <OwnerInput placeholder="Instagram" value={form.instagram} onChange={(e) => onChange("instagram", e.target.value)} />

      <textarea
        placeholder="Qisqa izoh"
        value={form.description}
        onChange={(e) => onChange("description", e.target.value)}
        rows={3}
        style={{ width: "100%", border: "1px solid rgba(16,32,21,0.12)", borderRadius: 15, padding: "12px 13px", fontSize: 15, outline: "none", background: "#fbfdfb", resize: "vertical" }}
      />
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 750,
  color: "#627064",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(16,32,21,0.12)",
  borderRadius: 15,
  padding: "12px 13px",
  fontSize: 15,
  outline: "none",
  background: "#fbfdfb",
  color: "#102015",
};
