"use client";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import { useMyBookings } from "@/hooks/useMyBookings";
import { formatPrice, getBookingStatusLabel } from "@/lib/utils";
import { CalendarCheck, ClipboardList, Clock3 } from "lucide-react";

export default function MiniBookingsPage() {
  const { theme } = useTelegram();

  const { data: bookings = [], isLoading } = useMyBookings();

  const textSec = theme === "dark" ? "#8e8e93" : "#6e6e73";

  if (isLoading) {
    return <div className="mini-loader"><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div>;
  }

  return (
    <div>
      <div className="mini-title-row">
        <div>
          <div className="mini-eyebrow">Rejalar</div>
          <h1 className="mini-large-title">Bronlarim</h1>
        </div>
        <span className="mini-chip">{bookings.length} ta</span>
      </div>

      {bookings.length === 0 ? (
        <div className="mini-card" style={{ textAlign: "center", padding: "42px 22px", color: textSec }}>
          <div className="mini-glyph mini-glyph-blue" style={{ width: 58, height: 58, borderRadius: 22, margin: "0 auto 14px" }}>
            <ClipboardList size={28} />
          </div>
          <h2 style={{ color: "var(--mini-text)", fontSize: 20, marginBottom: 6 }}>Bronlar yo'q</h2>
          <p style={{ fontSize: 14 }}>Yangi bron yaratganingizda u shu yerda ko'rinadi.</p>
        </div>
      ) : (
        <div className="mini-list">
          {bookings.map((b: any) => {
            const statusColor = b.status === "confirmed" ? "var(--mini-green)" : b.status === "pending" ? "var(--mini-orange)" : "var(--mini-red)";
            return (
              <div key={b.id} className="mini-card-solid" style={{ padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <span style={{ fontWeight: 760, fontSize: 17, letterSpacing: "-0.015em" }}>{b.stadium_name}</span>
                  <span className="mini-chip" style={{ color: statusColor, backgroundColor: `${statusColor}20` }}>
                    {getBookingStatusLabel(b.status)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: textSec, marginBottom: 4 }}>
                  <CalendarCheck size={13} /> {b.date}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: textSec, marginBottom: 4 }}>
                  <Clock3 size={13} /> {b.start_time} — {b.end_time}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontWeight: 700, color: "var(--mini-green)", fontSize: 15 }}>{formatPrice(b.total_price)}</span>
                  <span style={{ fontSize: 11, color: textSec, fontFamily: "monospace" }}>{b.booking_code}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
