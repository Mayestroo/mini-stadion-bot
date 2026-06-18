"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { User } from "@/lib/types";
import { AdminButton, AdminCard, AdminEmptyState, AdminInfoRow, AdminInput, AdminLoading, AdminShell } from "@/components/admin/AdminShell";
import { IdCard, UserRound, Users } from "lucide-react";

export default function AdminOwnersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ full_name: "", telegram_id: "", owner_login: "", temporary_password: "" });
  const [message, setMessage] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const { data: owners = [], isLoading } = useQuery({ queryKey: ["admin-owners"], queryFn: superadminApi.getOwners });
  const createMutation = useMutation({
    mutationFn: () => superadminApi.createOwner({
      full_name: form.full_name.trim(),
      telegram_id: form.telegram_id.trim(),
      owner_login: form.owner_login.trim(),
      temporary_password: form.temporary_password,
    }),
    onSuccess: () => {
      setForm({ full_name: "", telegram_id: "", owner_login: "", temporary_password: "" });
      setMessage({ tone: "green", text: "Owner muvaffaqiyatli yaratildi" });
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
    onError: (error) => setMessage({ tone: "red", text: getApiErrorMessage(error) }),
  });

  function setField(field: string, value: string) {
    setMessage(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.temporary_password.length < 6) {
      setMessage({ tone: "red", text: "Vaqtinchalik parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      return;
    }
    createMutation.mutate();
  }

  return (
    <AdminShell title="Ownerlar" subtitle="Telegram ID orqali owner yaratish">
        <AdminCard style={{ marginBottom: 12 }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <div className="mini-glyph mini-glyph-blue" style={{ width: 40, height: 40 }}><Users size={20} /></div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 780 }}>Yangi owner</div>
              <div style={{ color: "var(--mini-muted)", fontSize: 13 }}>Login va vaqtinchalik parol yarating</div>
            </div>
          </div>
          <AdminInput placeholder="Ism" value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} required />
          <AdminInput placeholder="Telegram ID" value={form.telegram_id} onChange={(e) => setField("telegram_id", e.target.value)} required inputMode="numeric" />
          <AdminInput placeholder="Owner login" value={form.owner_login} onChange={(e) => setField("owner_login", e.target.value)} required />
          <AdminInput placeholder="Vaqtinchalik parol" value={form.temporary_password} onChange={(e) => setField("temporary_password", e.target.value)} required minLength={6} type="password" />
          {message ? <div style={{ padding: "10px 12px", borderRadius: 14, background: message.tone === "green" ? "rgba(52,199,89,0.14)" : "rgba(255,59,48,0.12)", color: message.tone === "green" ? "var(--mini-green)" : "var(--mini-red)", fontSize: 13, fontWeight: 700 }}>{message.text}</div> : null}
          <AdminButton type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Yaratilmoqda..." : "Yaratish"}</AdminButton>
        </form>
        </AdminCard>
        {isLoading ? <AdminLoading /> : owners.length === 0 ? <AdminEmptyState icon={<Users size={28} />} title="Ownerlar yo'q" text="Yaratilgan ownerlar shu ro'yxatda ko'rinadi." /> : <div className="mini-list">
          {owners.map((owner: User) => <AdminCard key={owner.id}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><div className="mini-glyph" style={{ width: 42, height: 42 }}>{owner.full_name[0]}</div><div><b style={{ fontSize: 17 }}>{owner.full_name}</b><div style={{ color: "var(--mini-muted)", fontSize: 13 }}>Owner hisob</div></div></div><div className="mini-card-solid" style={{ padding: "2px 12px" }}><AdminInfoRow icon={<UserRound size={15} />} label="Login" value={owner.owner_login || "—"} /><AdminInfoRow icon={<IdCard size={15} />} label="Telegram ID" value={owner.telegram_id || "—"} last /></div></AdminCard>)}
        </div>}
    </AdminShell>
  );
}

function getApiErrorMessage(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item?.msg === "string") return item.msg;
      return "Ma'lumotlarni tekshirib qayta urinib ko'ring";
    }).join(". ");
  }
  return "Owner yaratishda xatolik yuz berdi";
}
