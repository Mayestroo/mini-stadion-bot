"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { stadiumApi, bookingApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Header } from "@/components/layout/Header";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { formatPrice } from "@/lib/utils";

function calculatePrice(stadium: any, startTime: string, endTime: string, date: string): number {
  const startH = parseInt(startTime.split(":")[0]);
  const endH = parseInt(endTime.split(":")[0]);
  const duration = endH - startH;
  const d = new Date(date);
  const isWeekend = d.getDay() === 5 || d.getDay() === 6;
  const isNight = startH >= 20;
  let pricePerHour = stadium.price_per_hour;
  if (isWeekend && stadium.price_weekend) pricePerHour = stadium.price_weekend;
  else if (isNight && stadium.price_night) pricePerHour = stadium.price_night;
  return pricePerHour * duration;
}

export default function BookingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<"stadium" | "date" | "time" | "confirm">("stadium");
  const [selectedStadium, setSelectedStadium] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login?redirect=" + encodeURIComponent("/bron"));
  }, [isAuthenticated, router]);

  const { data: stadiums = [] } = useQuery({
    queryKey: ["stadiums"],
    queryFn: () => stadiumApi.getAll(),
  });

  const { data: availability } = useQuery({
    queryKey: ["availability", selectedStadium?.id, selectedDate],
    queryFn: () => stadiumApi.getAvailability(selectedStadium.id, selectedDate),
    enabled: !!selectedStadium && !!selectedDate,
  });

  const today = new Date().toISOString().split("T")[0];

  const handleBook = async () => {
    setLoading(true);
    try {
      await bookingApi.create({
        stadium_id: selectedStadium.id,
        date: selectedDate,
        start_time: selectedStart,
        end_time: selectedEnd,
      });
      router.push("/profil");
    } catch {
      alert("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Header />
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Bron qilish</h1>

        {step === "stadium" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>1. Stadionni tanlang</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stadiums.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStadium(s); setStep("date"); }}
                  style={{ textAlign: "left", padding: "16px 20px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--color-border)", backgroundColor: "var(--color-surface)", cursor: "pointer", fontSize: 15, fontWeight: 500, display: "flex", justifyContent: "space-between" }}
                >
                  <span>{s.name}</span>
                  <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>{formatPrice(s.price_per_hour)}/soat</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "date" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>2. Sanani tanlang</h2>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setStep("time"); }}
              style={{ width: "100%", padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border)", fontSize: 16, outline: "none" }}
            />
            <button onClick={() => setStep("stadium")} style={{ marginTop: 12, padding: "10px 20px", borderRadius: "var(--radius-full)", border: "1px solid var(--color-border)", backgroundColor: "transparent", cursor: "pointer", fontSize: 14 }}>
              ← Orqaga
            </button>
          </div>
        )}

        {step === "time" && availability && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>3. Vaqtni tanlang</h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16 }}>{selectedStadium.name} · {selectedDate}</p>
            <TimeSlotPicker
              slots={availability.slots}
              selectedStart={selectedStart}
              selectedEnd={selectedEnd}
              onSelect={(start, end) => { setSelectedStart(start); setSelectedEnd(end); }}
            />
            {selectedStart && selectedEnd && (
              <button
                onClick={() => setStep("confirm")}
                style={{ marginTop: 20, width: "100%", padding: "14px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: "var(--color-accent)", color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
              >
                Davom etish
              </button>
            )}
            <button onClick={() => setStep("date")} style={{ marginTop: 8, padding: "10px 20px", borderRadius: "var(--radius-full)", border: "1px solid var(--color-border)", backgroundColor: "transparent", cursor: "pointer", fontSize: 14 }}>
              ← Orqaga
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: 24, border: "1px solid var(--color-border)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>4. Bronni tasdiqlash</h2>
            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              <InfoRow label="Stadion" value={selectedStadium.name} />
              <InfoRow label="Sana" value={selectedDate} />
              <InfoRow label="Vaqt" value={`${selectedStart} — ${selectedEnd}`} />
              <InfoRow label="Narx" value={formatPrice(calculatePrice(selectedStadium, selectedStart, selectedEnd, selectedDate))} />
            </div>
            <button
              onClick={handleBook}
              disabled={loading}
              style={{ width: "100%", padding: "14px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: loading ? "var(--color-accent-hover)" : "var(--color-accent)", color: "white", fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Yuborilmoqda..." : "✅ Bronni tasdiqlash"}
            </button>
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
