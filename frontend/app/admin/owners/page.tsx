"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "@/lib/api";
import { User } from "@/lib/types";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminButton, AdminCard, AdminEmptyState, AdminErrorState, AdminInfoRow, AdminInput, AdminLoading, AdminShell, AdminStatusBadge } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { IdCard, Pencil, Phone, ShieldBan, UserRound, Users } from "lucide-react";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";

const emptyCreateForm = { full_name: "", telegram_id: "", owner_login: "", temporary_password: "" };
const emptyEditForm = { full_name: "", telegram_id: "", owner_login: "", phone: "", temporary_password: "" };

export default function AdminOwnersPage() {
  const isSuperadmin = useRequireSuperadmin();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyCreateForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [blocking, setBlocking] = useState<User | null>(null);
  const [q, setQ] = useState("");

  // Debounce the search box so every keystroke doesn't hit the API.
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const ownersQuery = useQuery({ queryKey: ["admin-owners", debouncedQ], queryFn: () => superadminApi.getOwners({ q: debouncedQ || undefined }), placeholderData: (previous) => previous });
  const owners = ownersQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => superadminApi.createOwner({
      full_name: form.full_name.trim(),
      telegram_id: form.telegram_id.trim(),
      owner_login: form.owner_login.trim(),
      temporary_password: form.temporary_password,
    }),
    onSuccess: () => {
      setForm(emptyCreateForm);
      toast.push("green", "Owner muvaffaqiyatli yaratildi");
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
    onError: (error) => toast.push("red", getApiErrorMessage(error, "Owner yaratishda xatolik yuz berdi")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => superadminApi.updateOwner(id, data),
    onSuccess: () => {
      setEditingId(null);
      setBlocking(null);
      toast.push("green", "Owner ma'lumotlari yangilandi");
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
    onError: (error) => toast.push("red", getApiErrorMessage(error, "Ownerni yangilashda xatolik yuz berdi")),
  });

  function setField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setEditField(field: string, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function isValidPassword(pw: string) {
    return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValidPassword(form.temporary_password)) {
      toast.push("red", "Parol kamida 8 ta belgi, 1 ta katta/kichik harf va 1 ta raqam bo'lishi kerak");
      return;
    }
    createMutation.mutate();
  }

  function startEdit(owner: User) {
    setEditingId(editingId === owner.id ? null : owner.id);
    setEditForm({
      full_name: owner.full_name || "",
      telegram_id: owner.telegram_id || "",
      owner_login: owner.owner_login || "",
      phone: owner.phone || "",
      temporary_password: "",
    });
  }

  function saveEdit(id: number) {
    const data: Record<string, unknown> = {};
    const fields: Array<keyof typeof emptyEditForm> = ["full_name", "telegram_id", "owner_login", "phone"];
    for (const field of fields) {
      const value = editForm[field].trim();
      if (value) data[field] = value;
    }
    if (editForm.temporary_password) {
      if (!isValidPassword(editForm.temporary_password)) {
        toast.push("red", "Yangi parol kamida 8 ta belgi, 1 ta katta/kichik harf va 1 ta raqam bo'lishi kerak");
        return;
      }
      data.temporary_password = editForm.temporary_password;
    }
    if (Object.keys(data).length === 0) {
      toast.push("red", "Hech qanday o'zgarish kiritilmadi");
      return;
    }
    updateMutation.mutate({ id, data });
  }

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Ownerlar" subtitle="Owner hisoblarini yaratish va boshqarish">
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
          <AdminInput placeholder="Vaqtinchalik parol" value={form.temporary_password} onChange={(e) => setField("temporary_password", e.target.value)} required minLength={8} type="password" />
          <AdminButton type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Yaratilmoqda..." : "Yaratish"}</AdminButton>
        </form>
        </AdminCard>
        <AdminCard style={{ marginBottom: 12, padding: 12 }}>
          <AdminInput placeholder="Qidirish (ism, login, telefon, Telegram ID)" value={q} onChange={(e) => setQ(e.target.value)} />
        </AdminCard>
        {ownersQuery.isLoading ? <AdminLoading /> : ownersQuery.isError ? <AdminErrorState text="Xatolik yuz berdi. Ownerlarni yuklab bo'lmadi." onRetry={() => ownersQuery.refetch()} /> : owners.length === 0 ? <AdminEmptyState icon={<Users size={28} />} title="Ownerlar topilmadi" text="Qidiruv shartlarini o'zgartiring yoki yangi owner yarating." /> : <div className="mini-list">
          {owners.map((owner: User) => <AdminCard key={owner.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div className="mini-glyph" style={{ width: 42, height: 42, flexShrink: 0 }}>{owner.full_name[0]}</div>
                <div style={{ minWidth: 0 }}><b style={{ fontSize: 17 }}>{owner.full_name}</b><div style={{ color: "var(--mini-muted)", fontSize: 13 }}>Owner hisob</div></div>
              </div>
              <AdminStatusBadge status={owner.is_active ? "active" : "inactive"} label={owner.is_active ? "Faol" : "Bloklangan"} />
            </div>
            <div className="mini-card-solid" style={{ padding: "2px 12px" }}>
              <AdminInfoRow icon={<UserRound size={15} />} label="Login" value={owner.owner_login || "—"} />
              <AdminInfoRow icon={<IdCard size={15} />} label="Telegram ID" value={owner.telegram_id || "—"} />
              <AdminInfoRow icon={<Phone size={15} />} label="Telefon" value={owner.phone || "—"} last />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <AdminButton tone="dark" onClick={() => startEdit(owner)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Pencil size={15} /> Tahrirlash</span>
              </AdminButton>
              <AdminButton tone={owner.is_active ? "red" : "green"} onClick={() => setBlocking(owner)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><ShieldBan size={15} /> {owner.is_active ? "Bloklash" : "Faollashtirish"}</span>
              </AdminButton>
            </div>
            {editingId === owner.id ? (
              <div className="mini-card-solid" style={{ display: "grid", gap: 8, padding: 12, marginTop: 12 }}>
                <AdminInput placeholder="Ism" value={editForm.full_name} onChange={(e) => setEditField("full_name", e.target.value)} />
                <AdminInput placeholder="Owner login" value={editForm.owner_login} onChange={(e) => setEditField("owner_login", e.target.value)} />
                <AdminInput placeholder="Telegram ID" value={editForm.telegram_id} onChange={(e) => setEditField("telegram_id", e.target.value)} inputMode="numeric" />
                <AdminInput placeholder="Telefon (+998...)" value={editForm.phone} onChange={(e) => setEditField("phone", e.target.value)} />
                <AdminInput placeholder="Yangi parol (ixtiyoriy — sessiyalar bekor qilinadi)" value={editForm.temporary_password} onChange={(e) => setEditField("temporary_password", e.target.value)} type="password" minLength={8} />
                <AdminButton onClick={() => saveEdit(owner.id)} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}</AdminButton>
              </div>
            ) : null}
          </AdminCard>)}
        </div>}
        <AdminConfirmDialog
          open={blocking !== null}
          danger={blocking?.is_active ?? true}
          title={blocking?.is_active ? "Ownerni bloklash" : "Ownerni faollashtirish"}
          text={blocking
            ? blocking.is_active
              ? `${blocking.full_name} owner paneliga kira olmay qoladi. Stadionlari o'chirilmaydi, lekin boshqara olmaydi.`
              : `${blocking.full_name} qayta owner paneliga kira oladi.`
            : undefined}
          busy={updateMutation.isPending}
          onCancel={() => setBlocking(null)}
          onConfirm={() => blocking && updateMutation.mutate({ id: blocking.id, data: { is_active: !blocking.is_active } })}
        />
    </AdminShell>
  );
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item?.msg === "string") return item.msg;
      return "Ma'lumotlarni tekshirib qayta urinib ko'ring";
    }).join(". ");
  }
  return fallback;
}
