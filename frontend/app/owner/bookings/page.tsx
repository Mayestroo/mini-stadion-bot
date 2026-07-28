"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerApi } from "@/lib/api";
import { formatPrice, getBookingStatusLabel } from "@/lib/utils";
import { Booking } from "@/lib/types";
import { OwnerButton, OwnerCard, OwnerInput, OwnerShell } from "@/components/owner/OwnerShell";

export default function OwnerBookingsPage() {
  const queryClient = useQueryClient();
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const { data: bookings = [], isLoading } = useQuery({ queryKey: ["owner-bookings"], queryFn: () => ownerApi.getBookings() });
  const confirmMutation = useMutation({ mutationFn: ownerApi.confirmBooking, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-bookings"] }) });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => ownerApi.requestCancel(id, reason),
    onSuccess: () => { setCancelId(null); setReason(""); queryClient.invalidateQueries({ queryKey: ["owner-bookings"] }); },
  });

  return (
    <OwnerShell>
      <div style={{ display: "grid", gap: 10 }}>
        <OwnerCard><h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Bronlar</h2><p style={{ color: "#627064", marginTop: 4 }}>Pending bronlarni tasdiqlang yoki bekor qilishga so'rov yuboring.</p></OwnerCard>
        {isLoading ? <div className="mini-loader mini-loader-sm"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div> : bookings.map((booking: Booking) => (
          <OwnerCard key={booking.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div><b>{booking.stadium_name}</b><div style={{ color: "#627064", fontSize: 13 }}>{booking.user_name} · {booking.user_phone || "—"}</div></div>
              <span style={{ height: 28, padding: "5px 10px", borderRadius: 999, background: booking.status === "confirmed" ? "rgba(52,199,89,0.14)" : "rgba(255,149,0,0.14)", color: booking.status === "confirmed" ? "#19a850" : "#c97800", fontSize: 12, fontWeight: 850 }}>{getBookingStatusLabel(booking.status)}</span>
            </div>
            <div style={{ marginTop: 10, color: "#233429", fontWeight: 800 }}>{booking.date} · {booking.start_time}-{booking.end_time} · {formatPrice(booking.total_price)}</div>
            {booking.status === "pending" ? <div style={{ display: "flex", gap: 8, marginTop: 12 }}><OwnerButton onClick={() => confirmMutation.mutate(booking.id)}>Tasdiqlash</OwnerButton><OwnerButton tone="red" onClick={() => setCancelId(booking.id)}>Bekor so'rovi</OwnerButton></div> : null}
            {cancelId === booking.id ? <div style={{ display: "grid", gap: 8, marginTop: 12 }}><OwnerInput placeholder="Bekor qilish sababi" value={reason} onChange={(e) => setReason(e.target.value)} /><OwnerButton tone="dark" onClick={() => cancelMutation.mutate({ id: booking.id, reason })}>Superadminga yuborish</OwnerButton></div> : null}
          </OwnerCard>
        ))}
      </div>
    </OwnerShell>
  );
}
