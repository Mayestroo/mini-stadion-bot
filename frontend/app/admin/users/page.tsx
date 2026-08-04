"use client";

import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, ShieldBan, SlidersHorizontal, UserRound, Users } from "lucide-react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminButton, AdminCard, AdminEmptyState, AdminErrorState, AdminInput, AdminLoadMoreButton, AdminLoading, AdminSelect, AdminShell, AdminStatusBadge } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { superadminApi } from "@/lib/api";
import { BASE_URL } from "@/lib/api/client";
import { User } from "@/lib/types";
import { useRequireSuperadmin } from "@/lib/hooks/useRequireSuperadmin";

const roleLabels: Record<string, string> = {
  user: "User",
  owner: "Owner",
  moderator: "Moderator",
  superadmin: "Superadmin",
  guest: "Guest",
};

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  const isSuperadmin = useRequireSuperadmin();
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [blocking, setBlocking] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);

  // Debounce the search box so every keystroke doesn't hit the API.
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const query = useInfiniteQuery({
    queryKey: ["admin-users", debouncedQ, role],
    queryFn: ({ pageParam }) => superadminApi.getUsers({ q: debouncedQ || undefined, role: role || undefined, skip: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    placeholderData: (previous) => previous,
  });

  const users = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const block = useMutation({
    mutationFn: (id: number) => superadminApi.toggleUserBlock(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setBlocking(null);
      toast.push("green", updated.is_active ? "Foydalanuvchi blokdan chiqarildi" : "Foydalanuvchi bloklandi");
    },
    onError: (error: any) => toast.push("red", error.response?.data?.detail || "Amalni bajarib bo'lmadi"),
  });

  const roleChange = useMutation({
    mutationFn: ({ id, role }: { id: number; role: "user" | "moderator" }) => superadminApi.setUserRole(id, role),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setRoleTarget(null);
      toast.push("green", `Rol yangilandi: ${updated.full_name} → ${roleLabels[updated.role] || updated.role}`);
    },
    onError: (error: any) => {
      setRoleTarget(null);
      toast.push("red", error.response?.data?.detail || "Rolni o'zgartirib bo'lmadi");
    },
  });

  const exportParams = new URLSearchParams();
  if (debouncedQ) exportParams.set("q", debouncedQ);
  if (role) exportParams.set("role", role);
  const exportUrl = `${BASE_URL}/api/v1/admin/export/users${exportParams.size ? `?${exportParams}` : ""}`;

  if (!isSuperadmin) return null;

  return (
    <AdminShell title="Userlar" subtitle={total ? `${total} ta foydalanuvchi` : undefined}>
      <AdminCard style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <AdminInput placeholder="Ism, telefon, Telegram ID yoki login bo'yicha qidirish" value={q} onChange={(e) => setQ(e.target.value)} />
        <AdminSelect value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Barcha rollar</option>
          <option value="user">User</option>
          <option value="owner">Owner</option>
          <option value="moderator">Moderator</option>
          <option value="superadmin">Superadmin</option>
          <option value="guest">Guest</option>
        </AdminSelect>
        <AdminButton tone="dark" onClick={() => window.open(exportUrl, "_blank")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Download size={15} /> CSV yuklab olish</span>
        </AdminButton>
      </AdminCard>

      {query.isLoading ? (
        <AdminLoading />
      ) : query.isError ? (
        <AdminErrorState text="Xatolik yuz berdi. Foydalanuvchilarni yuklab bo'lmadi." onRetry={() => query.refetch()} />
      ) : users.length === 0 ? (
        <AdminEmptyState icon={<Users size={28} />} title="Foydalanuvchi topilmadi" text="Qidiruv shartlarini o'zgartirib ko'ring." />
      ) : (
        <>
          <div className="mini-list">
            {users.map((u) => (
              <AdminCard key={u.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div className="mini-glyph" style={{ width: 42, height: 42, flexShrink: 0 }}>{u.full_name?.[0] || <UserRound size={20} />}</div>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 16 }}>{u.full_name}</b>
                      <div style={{ color: "var(--mini-muted)", fontSize: 13, marginTop: 2 }}>
                        {u.phone || u.telegram_id || "—"} · {roleLabels[u.role] || u.role}
                      </div>
                    </div>
                  </div>
                  <AdminStatusBadge status={u.is_active ? "active" : "blocked"} label={u.is_active ? "Faol" : "Bloklangan"} />
                </div>
                {u.role !== "superadmin" ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    <AdminButton tone={u.is_active ? "red" : "green"} disabled={block.isPending} onClick={() => setBlocking(u)}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <ShieldBan size={15} /> {u.is_active ? "Bloklash" : "Blokdan chiqarish"}
                      </span>
                    </AdminButton>
                    {(u.role === "user" || u.role === "moderator") ? (
                      <AdminButton tone="blue" onClick={() => setRoleTarget(u)}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          <SlidersHorizontal size={15} /> {u.role === "moderator" ? "Oddiy userga tushirish" : "Moderator qilish"}
                        </span>
                      </AdminButton>
                    ) : null}
                  </div>
                ) : null}
              </AdminCard>
            ))}
          </div>
          <AdminLoadMoreButton hasMore={query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
        </>
      )}

      <AdminConfirmDialog
        open={blocking !== null}
        danger={blocking?.is_active ?? true}
        title={blocking?.is_active ? "Foydalanuvchini bloklash" : "Blokdan chiqarish"}
        text={blocking
          ? blocking.is_active
            ? `${blocking.full_name} tizimga kira olmaydi va barcha sessiyalari darhol bekor qilinadi.`
            : `${blocking.full_name} qayta tizimga kira oladi.`
          : undefined}
        busy={block.isPending}
        onCancel={() => setBlocking(null)}
        onConfirm={() => blocking && block.mutate(blocking.id)}
      />
      <AdminConfirmDialog
        open={roleTarget !== null}
        danger={roleTarget?.role === "moderator"}
        title={roleTarget?.role === "moderator" ? "Moderatorlikdan olish" : "Moderator qilish"}
        text={roleTarget
          ? roleTarget.role === "moderator"
            ? `${roleTarget.full_name} admin panel huquqlarini yo'qotadi va qayta login bo'ladi.`
            : `${roleTarget.full_name} admin panelga (bronlar, bildirishnomalar) kirish huquqiga ega bo'ladi va qayta login bo'ladi.`
          : undefined}
        busy={roleChange.isPending}
        onCancel={() => setRoleTarget(null)}
        onConfirm={() => roleTarget && roleChange.mutate({ id: roleTarget.id, role: roleTarget.role === "moderator" ? "user" : "moderator" })}
      />
    </AdminShell>
  );
}
