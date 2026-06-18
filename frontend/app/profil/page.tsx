"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { bookingApi } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { formatPrice, getBookingStatusLabel } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login?redirect=" + encodeURIComponent("/profil"));
  }, [isAuthenticated, router]);

  const { data: bookings = [] } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => bookingApi.getMyBookings(),
    enabled: isAuthenticated,
  });

  if (!user) return null;

  return (
    <>
      <Header />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: 32, border: "1px solid var(--color-border)", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: "var(--color-accent-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "var(--color-accent)" }}>
              {user.full_name[0]}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700 }}>{user.full_name}</h1>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{user.phone || "Telefon ulanmagan"}</p>
            </div>
          </div>

          <div style={{ height: 1, backgroundColor: "var(--color-border)", marginBottom: 24 }} />

          <div style={{ display: "grid", gap: 16 }}>
            <InfoRow label="Telefon" value={user.phone || "—"} />
            <InfoRow label="Rol" value={user.role === "moderator" ? "Moderator" : user.role === "superadmin" ? "Super Admin" : user.role === "owner" ? "Owner" : "Foydalanuvchi"} />
            <InfoRow label="Telegram ID" value={user.telegram_id || "—"} />
          </div>

          <button
            onClick={() => { logout(); router.push("/"); }}
            style={{ marginTop: 24, padding: "12px 24px", borderRadius: "var(--radius-full)", border: "1.5px solid var(--color-error)", backgroundColor: "transparent", color: "var(--color-error)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Chiqish
          </button>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Mening bronlarim</h2>
        {bookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-secondary)" }}>
            <p>Bronlaringiz mavjud emas</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bookings.map((b: any) => (
              <div key={b.id} style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-lg)", padding: 16, border: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{b.stadium_name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: "var(--radius-full)", backgroundColor: b.status === "confirmed" ? "rgba(52,199,89,0.12)" : b.status === "pending" ? "rgba(255,149,0,0.12)" : "rgba(255,59,48,0.12)", color: b.status === "confirmed" ? "var(--color-success)" : b.status === "pending" ? "var(--color-warning)" : "var(--color-error)" }}>
                    {getBookingStatusLabel(b.status)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {b.date} · {b.start_time}–{b.end_time} · {formatPrice(b.total_price)}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4, fontFamily: "monospace" }}>
                  {b.booking_code}
                </div>
              </div>
            ))}
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
      <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
