"use client";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingApi } from "@/lib/api";
import { BASE_URL } from "@/lib/api/client";
import { Booking } from "@/lib/types";
import { formatPrice, getBookingStatusLabel } from "@/lib/utils";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminButton, AdminCard, AdminEmptyState, AdminErrorState, AdminInput, AdminLoadMoreButton, AdminLoading, AdminSelect, AdminShell, AdminStatusBadge } from "@/components/admin/AdminShell";
import { CalendarCheck, ClipboardList, Clock3, Download, Phone } from "lucide-react";

type PendingAction = { id: number; status: string; stadium: string; date: string; time: string };

const PAGE_SIZE = 25;

export default function AdminBookings() {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<PendingAction | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Debounce the search box so every keystroke doesn't hit the API.
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const query = useInfiniteQuery({
    queryKey: ["admin-bookings", debouncedQ, status, dateFrom, dateTo],
    queryFn: ({ pageParam }) => bookingApi.getAllAdmin({
      q: debouncedQ || undefined,
      status: status || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      skip: pageParam,
      limit: PAGE_SIZE,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    placeholderData: (previous) => previous,
  });

  const bookings = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const exportParams = new URLSearchParams();
  if (debouncedQ) exportParams.set("q", debouncedQ);
  if (status) exportParams.set("status", status);
  if (dateFrom) exportParams.set("date_from", dateFrom);
  if (dateTo) exportParams.set("date_to", dateTo);
  const exportUrl = `${BASE_URL}/api/v1/admin/export/bookings${exportParams.size ? `?${exportParams}` : ""}`;

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => bookingApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      setAction(null);
    },
  });

  return (
    <AdminShell title="Bronlar" subtitle={total ? `${total} ta bron` : "Bronlarni tasdiqlash va statuslarini boshqarish"}>
        <AdminCard style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          <AdminInput placeholder="Ism, telefon yoki bron kodi bo'yicha qidirish" value={q} onChange={(e) => setQ(e.target.value)} />
          <AdminSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Barcha statuslar</option>
            <option value="pending">Kutilmoqda</option>
            <option value="confirmed">Tasdiqlangan</option>
            <option value="completed">Yakunlangan</option>
            <option value="cancelled">Bekor qilingan</option>
            <option value="no_show">Kelmagan</option>
          </AdminSelect>
          <div className="mini-responsive-grid-2">
            <AdminInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <AdminInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <AdminButton tone="dark" onClick={() => window.open(exportUrl, "_blank")}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Download size={15} /> CSV yuklab olish</span>
          </AdminButton>
        </AdminCard>

        {query.isLoading ? (
          <AdminLoading />
        ) : query.isError ? (
          <AdminErrorState text="Xatolik yuz berdi. Bronlarni yuklab bo'lmadi." onRetry={() => query.refetch()} />
        ) : bookings.length === 0 ? (
          <AdminEmptyState icon={<ClipboardList size={28} />} title="Bronlar yo'q" text="Filtrlarni o'zgartirib ko'ring yoki yangi bronlarni kuting." />
        ) : (
          <>
            <div className="mini-list">
              {bookings.map((b: Booking) => (
                <AdminCard key={b.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 760, fontSize: 17, letterSpacing: "-0.015em" }}>{b.stadium_name}</div>
                      <div style={{ fontSize: 13, color: "var(--mini-muted)", marginTop: 2 }}>{b.user_name} · #{b.booking_code}</div>
                    </div>
                    <AdminStatusBadge status={b.status} label={getBookingStatusLabel(b.status)} />
                  </div>
                  <div style={{ display: "grid", gap: 5, color: "var(--mini-muted)", fontSize: 13, marginBottom: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Phone size={13} /> {b.user_phone || "Telefon yo'q"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><CalendarCheck size={13} /> {b.date}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock3 size={13} /> {b.start_time}–{b.end_time}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "var(--mini-green)", fontWeight: 800 }}>{formatPrice(b.total_price)}</span>
                    {b.status === "pending" ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <AdminButton onClick={() => setAction({ id: b.id, status: "confirmed", stadium: b.stadium_name, date: b.date, time: `${b.start_time}–${b.end_time}` })}>Tasdiqlash</AdminButton>
                        <AdminButton tone="red" onClick={() => setAction({ id: b.id, status: "cancelled", stadium: b.stadium_name, date: b.date, time: `${b.start_time}–${b.end_time}` })}>Bekor</AdminButton>
                      </div>
                    ) : null}
                  </div>
                </AdminCard>
              ))}
            </div>
            <AdminLoadMoreButton hasMore={query.hasNextPage} loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()} />
          </>
        )}
        <AdminConfirmDialog
          open={action !== null}
          danger={action?.status === "cancelled"}
          title={action?.status === "cancelled" ? "Bronni bekor qilish" : "Bronni tasdiqlash"}
          text={action ? `${action.stadium} · ${action.date} · ${action.time}` : undefined}
          busy={updateMutation.isPending}
          onCancel={() => setAction(null)}
          onConfirm={() => action && updateMutation.mutate({ id: action.id, status: action.status })}
        />
    </AdminShell>
  );
}
