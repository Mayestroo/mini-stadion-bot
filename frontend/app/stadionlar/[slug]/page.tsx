"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { stadiumApi, bookingApi, getImageUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Header } from "@/components/layout/Header";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { formatPrice, getSurfaceLabel } from "@/lib/utils";
import { MapPin, Phone, Star, Zap, Car, Droplets, Footprints, Utensils, Sofa, Calendar } from "lucide-react";

export default function StadiumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAuthenticated } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [booking, setBooking] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const { data: stadium, isLoading } = useQuery({
    queryKey: ["stadium", slug],
    queryFn: () => stadiumApi.getOne(slug),
    enabled: !!slug,
  });

  const { data: availability } = useQuery({
    queryKey: ["availability", stadium?.id, selectedDate],
    queryFn: () => stadiumApi.getAvailability(stadium.id, selectedDate),
    enabled: !!stadium && !!selectedDate,
  });

  const handleBook = async () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=" + encodeURIComponent(`/stadionlar/${slug}`));
      return;
    }
    setBooking(true);
    try {
      await bookingApi.create({
        stadium_id: stadium.id,
        date: selectedDate,
        start_time: selectedStart,
        end_time: selectedEnd,
      });
      router.push("/profil");
    } catch {
      alert("Xatolik yuz berdi");
    } finally {
      setBooking(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ height: 400, borderRadius: "var(--radius-xl)", backgroundColor: "var(--color-bg-tertiary)", marginBottom: 24 }} />
          <div style={{ height: 24, width: "60%", borderRadius: 8, backgroundColor: "var(--color-bg-tertiary)", marginBottom: 12 }} />
          <div style={{ height: 16, width: "40%", borderRadius: 8, backgroundColor: "var(--color-bg-tertiary)" }} />
        </main>
      </>
    );
  }

  if (!stadium) {
    return (
      <>
        <Header />
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏟</div>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Stadion topilmadi</h2>
        </main>
      </>
    );
  }

  const allImages = stadium.cover_image
    ? [stadium.cover_image, ...(stadium.images || []).filter((i: string) => i !== stadium.cover_image)]
    : stadium.images || [];

  return (
    <>
      <Header />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 60px" }}>
        {allImages.length > 0 && (
          <div
            style={{
              height: 400,
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
              marginBottom: 24,
              position: "relative",
              background: "var(--color-bg-tertiary)",
            }}
          >
            <img
              src={getImageUrl(allImages[0])}
              alt={stadium.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {stadium.is_featured && (
              <span
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  backgroundColor: "var(--color-accent)",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                }}
              >
                TOP
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>{stadium.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", color: "var(--color-text-secondary)", fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={15} />
                {stadium.address}
              </div>
              {stadium.district && (
                <span style={{ padding: "2px 10px", borderRadius: "var(--radius-full)", backgroundColor: "var(--color-bg-secondary)", fontSize: 12 }}>
                  {stadium.district}
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Star size={14} fill="currentColor" style={{ color: "var(--color-warning)" }} />
                {stadium.rating.toFixed(1)}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--color-accent)" }}>
              {formatPrice(stadium.price_per_hour)}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>soatiga</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          {stadium.phone && (
            <a href={`tel:${stadium.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: "var(--radius-full)", border: "1.5px solid var(--color-border)", color: "var(--color-text-primary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              <Phone size={15} />
              {stadium.phone}
            </a>
          )}
          {stadium.telegram && (
            <a href={`https://t.me/${stadium.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: "var(--radius-full)", border: "1.5px solid var(--color-border)", color: "var(--color-text-primary)", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
              💬 {stadium.telegram}
            </a>
          )}
        </div>

        {stadium.description && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Tavsif</h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{stadium.description}</p>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Qulayliklar</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Amenity icon={<Zap size={14} />} label="Chiroq" active={stadium.has_lighting} />
            <Amenity icon={<Car size={14} />} label="Parking" active={stadium.has_parking} />
            <Amenity icon={<Droplets size={14} />} label="Dush" active={stadium.has_shower} />
            <Amenity icon={<Footprints size={14} />} label={getSurfaceLabel(stadium.surface)} active />
            <Amenity icon={<Sofa size={14} />} label="Kiyinish xonasi" active={stadium.has_changing_room} />
            <Amenity icon={<Utensils size={14} />} label="Kafe" active={stadium.has_cafe} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Narxlar</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <PriceCard label="Kun davomida" price={stadium.price_per_hour} />
            {stadium.price_weekend && <PriceCard label="Dam olish kuni" price={stadium.price_weekend} />}
            {stadium.price_night && <PriceCard label="Kechki (20:00 dan)" price={stadium.price_night} />}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={18} />
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Bron qilish</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            Ish vaqti: {stadium.open_time} — {stadium.close_time}
          </p>
          <input
            type="date"
            min={today}
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedStart(""); setSelectedEnd(""); }}
            style={{ width: "100%", maxWidth: 300, padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border)", fontSize: 15, outline: "none", marginBottom: 16 }}
          />

          {availability && (
            <>
              <TimeSlotPicker
                slots={availability.slots}
                selectedStart={selectedStart}
                selectedEnd={selectedEnd}
                onSelect={(start, end) => { setSelectedStart(start); setSelectedEnd(end); }}
              />
              {selectedStart && selectedEnd && (
                <button
                  onClick={handleBook}
                  disabled={booking}
                  style={{ marginTop: 20, width: "100%", padding: "14px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: booking ? "var(--color-accent-hover)" : "var(--color-accent)", color: "white", fontSize: 16, fontWeight: 600, cursor: booking ? "not-allowed" : "pointer" }}
                >
                  {booking ? "Yuborilmoqda..." : "✅ Bron qilish"}
                </button>
              )}
            </>
          )}
        </div>

        {stadium.width && stadium.length && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Maydon o'lchami</h2>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{stadium.width} × {stadium.length} m</p>
          </div>
        )}

        {allImages.length > 1 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Rasmlar</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {allImages.slice(1).map((url: string, i: number) => (
                <img
                  key={i}
                  src={getImageUrl(url)}
                  alt={`${stadium.name} ${i + 2}`}
                  style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "var(--radius-lg)" }}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Amenity({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "6px 14px",
        borderRadius: "var(--radius-full)",
        fontSize: 13,
        fontWeight: 500,
        color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
        backgroundColor: active ? "var(--color-bg-secondary)" : "transparent",
        border: "1.5px solid",
        borderColor: active ? "var(--color-border)" : "var(--color-border)",
        opacity: active ? 1 : 0.5,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function PriceCard({ label, price }: { label: string; price: number }) {
  return (
    <div style={{ padding: "16px", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent)" }}>{formatPrice(price)}</div>
    </div>
  );
}
