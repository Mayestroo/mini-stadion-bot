"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { bookingApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { formatPrice, getBookingStatusLabel, formatDate } from "@/lib/utils";

export default function BookingDetailPage() {
  const params = useParams();
  const code = params.code as string;

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", code],
    queryFn: () => bookingApi.getOne(code),
    enabled: !!code,
  });

  return (
    <>
      <Header />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        {isLoading ? (
          <div className="mini-loader"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div>
        ) : !booking ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔖</div>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>Bron topilmadi</h2>
          </div>
        ) : (
          <div style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: 32, border: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>Bron #{booking.booking_code}</h1>
              <span style={{ padding: "4px 14px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600, backgroundColor: booking.status === "confirmed" ? "rgba(52,199,89,0.12)" : booking.status === "pending" ? "rgba(255,149,0,0.12)" : "rgba(255,59,48,0.12)", color: booking.status === "confirmed" ? "var(--color-success)" : booking.status === "pending" ? "var(--color-warning)" : "var(--color-error)" }}>
                {getBookingStatusLabel(booking.status)}
              </span>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <InfoRow label="Stadion" value={booking.stadium_name} />
              <InfoRow label="Sana" value={booking.date} />
              <InfoRow label="Vaqt" value={`${booking.start_time} — ${booking.end_time}`} />
              <InfoRow label="Muddat" value={`${booking.duration_hours} soat`} />
              <InfoRow label="Narx" value={formatPrice(booking.total_price)} />
              <InfoRow label="Yaratilgan" value={formatDate(booking.created_at)} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
      <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
