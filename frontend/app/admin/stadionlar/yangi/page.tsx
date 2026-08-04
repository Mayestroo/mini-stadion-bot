"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { stadiumApi } from "@/lib/api";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";
import { AdminButton, AdminCard, AdminInput, AdminSelect, AdminShell, AdminTextArea } from "@/components/admin/AdminShell";

export default function NewStadium() {
  const isSuperadmin = useRequireSuperadmin();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", address: "", phone: "", price_per_hour: 0,
    description: "", district: "", latitude: "", longitude: "", google_map_link: "", yandex_map_link: "",
    has_lighting: false, has_parking: false,
    has_shower: false, has_changing_room: false, has_cafe: false, has_tribunes: false,
    surface: "artificial", open_time: "08:00", close_time: "23:00",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const features = [
    { key: "has_lighting", label: "Yoritish" },
    { key: "has_parking", label: "Parking" },
    { key: "has_shower", label: "Dush" },
    { key: "has_changing_room", label: "Kiyinish xonasi" },
    { key: "has_cafe", label: "Kafe" },
    { key: "has_tribunes", label: "Tribuna" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await stadiumApi.create({
        ...form,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        google_map_link: form.google_map_link || undefined,
        yandex_map_link: form.yandex_map_link || undefined,
      });
      router.push("/admin/stadionlar");
    } catch {
      setError("Stadionni saqlashda xatolik yuz berdi. Ma'lumotlarni tekshirib qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => setForm({ ...form, [field]: value });

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Yangi stadion" subtitle="Stadionni bevosita public ro'yxatga qo'shish">
      <AdminCard>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
          {error ? <div className="mini-card-solid" style={{ padding: 12, color: "var(--mini-red)", borderColor: "rgba(255,59,48,0.25)", background: "rgba(255,59,48,0.08)", fontSize: 13, fontWeight: 700 }}>{error}</div> : null}
          <div style={{ display: "grid", gap: 14 }}>
            <FormField label="Nomi">
              <AdminInput value={form.name} onChange={(e) => updateField("name", e.target.value)} required placeholder="Masalan: Arena 1" />
            </FormField>

            <FormField label="Manzil">
              <AdminInput value={form.address} onChange={(e) => updateField("address", e.target.value)} required placeholder="Ko'cha va mo'ljal" />
            </FormField>

            <FormField label="Tuman">
              <AdminInput value={form.district} onChange={(e) => updateField("district", e.target.value)} placeholder="Tuman nomi" />
            </FormField>

            <div className="mini-responsive-grid-2">
              <FormField label="Latitude (ixtiyoriy)">
                <AdminInput type="number" step="any" value={form.latitude} onChange={(e) => updateField("latitude", e.target.value)} placeholder="41.3111" />
              </FormField>
              <FormField label="Longitude (ixtiyoriy)">
                <AdminInput type="number" step="any" value={form.longitude} onChange={(e) => updateField("longitude", e.target.value)} placeholder="69.2797" />
              </FormField>
            </div>

            <FormField label="Google Maps link (ixtiyoriy)">
              <AdminInput value={form.google_map_link} onChange={(e) => updateField("google_map_link", e.target.value)} placeholder="https://maps.google.com/..." />
            </FormField>

            <FormField label="Yandex Maps link (ixtiyoriy)">
              <AdminInput value={form.yandex_map_link} onChange={(e) => updateField("yandex_map_link", e.target.value)} placeholder="https://yandex.uz/maps/..." />
            </FormField>

            <div className="mini-responsive-grid-2">
              <FormField label="Telefon">
                <AdminInput value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required placeholder="+998..." />
              </FormField>
              <FormField label="Soatlik narx (so'm)">
                <AdminInput type="number" value={form.price_per_hour} onChange={(e) => updateField("price_per_hour", Number(e.target.value))} required />
              </FormField>
            </div>

            <FormField label="Tavsif">
              <AdminTextArea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} placeholder="Stadion haqida qisqa ma'lumot" />
            </FormField>

            <FormField label="Qoplama">
              <AdminSelect value={form.surface} onChange={(e) => updateField("surface", e.target.value)}>
                <option value="artificial">Sun'iy o't</option>
                <option value="grass">Tabiiy o't</option>
                <option value="concrete">Beton</option>
              </AdminSelect>
            </FormField>

            <div className="mini-responsive-grid-2">
              <FormField label="Ochilish vaqti">
                <AdminInput type="time" value={form.open_time} onChange={(e) => updateField("open_time", e.target.value)} />
              </FormField>
              <FormField label="Yopilish vaqti">
                <AdminInput type="time" value={form.close_time} onChange={(e) => updateField("close_time", e.target.value)} />
              </FormField>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--mini-muted)" }}>Imkoniyatlar</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {features.map((feature) => {
                  const checked = Boolean((form as any)[feature.key]);
                  return (
                    <label key={feature.key} className="mini-pressable" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "8px 11px", borderRadius: 999, background: checked ? "rgba(52,199,89,0.15)" : "rgba(118,118,128,0.12)", color: checked ? "var(--mini-green)" : "var(--mini-muted)" }}>
                      <input type="checkbox" checked={checked} onChange={(e) => updateField(feature.key, e.target.checked)} style={{ accentColor: "var(--mini-green)" }} />
                      {feature.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <AdminButton type="submit" disabled={loading}>
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </AdminButton>
        </form>
      </AdminCard>
    </AdminShell>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "var(--mini-muted)" }}>{label}</label>
      {children}
    </div>
  );
}
