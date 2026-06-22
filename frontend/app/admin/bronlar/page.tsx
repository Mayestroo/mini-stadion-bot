"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingApi } from "@/lib/api";
import { formatPrice, getBookingStatusLabel } from "@/lib/utils";
import { AdminButton, AdminCard, AdminEmptyState, AdminLoading, AdminShell, AdminStatusBadge } from "@/components/admin/AdminShell";
import { CalendarCheck, ClipboardList, Clock3, Phone } from "lucide-react";

export default function AdminBookings() {
  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading, isError } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => bookingApi.getAllAdmin({ limit: 50 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => bookingApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });

  return (
    <AdminShell title="Bronlar" subtitle="Bronlarni tasdiqlash va statuslarini boshqarish">
        {isLoading ? (
          <AdminLoading />
        ) : isError ? (
          <AdminCard><p style={{ color: "var(--mini-red)", fontWeight: 700 }}>Xatolik yuz berdi. Bronlarni yuklab bo'lmadi.</p></AdminCard>
        ) : bookings.length === 0 ? (
          <AdminEmptyState icon={<ClipboardList size={28} />} title="Bronlar yo'q" text="Yangi bronlar yaratilganda shu yerda ko'rinadi." />
        ) : (
          <div className="mini-list">
            {bookings.map((b: any) => (
              <AdminCard key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 760, fontSize: 17, letterSpacing: "-0.015em" }}>{b.stadium_name}</div>
                    <div style={{ fontSize: 13, color: "var(--mini-muted)", marginTop: 2 }}>{b.user_name}</div>
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
                      <AdminButton onClick={() => updateMutation.mutate({ id: b.id, status: "confirmed" })}>Tasdiqlash</AdminButton>
                      <AdminButton tone="red" onClick={() => updateMutation.mutate({ id: b.id, status: "cancelled" })}>Bekor</AdminButton>
                    </div>
                  ) : null}
                </div>
              </AdminCard>
            ))}
          </div>
        )}
    </AdminShell>
  );
}
