"use client";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import { bookingApi, getImageUrl, stadiumApi, trainingApi } from "@/lib/api";
import { Training } from "@/lib/types";
import { sportLabel } from "@/lib/sports";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  Dumbbell,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Star
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function MiniStadiumDetail() {
  const params = useParams();
  const router = useRouter();
  const { showAlert } = useTelegram();
  const { user } = useAuthStore();
  const slug = params.slug as string;
  const bookingRef = useRef<HTMLDivElement>(null);

  const [showBooking, setShowBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [duration, setDuration] = useState(1);

  const { data: stadium, isLoading } = useQuery({
    queryKey: ["miniapp-stadium", slug],
    queryFn: () => stadiumApi.getOne(slug),
    enabled: !!slug,
  });

  const { data: availability } = useQuery({
    queryKey: ["miniapp-availability", stadium?.id, selectedDate],
    queryFn: () => stadiumApi.getAvailability(stadium!.id, selectedDate),
    enabled: !!stadium && !!selectedDate,
  });

  const { data: quote } = useQuery({
    queryKey: ["quote", stadium?.id, selectedDate, selectedStart, selectedEnd],
    queryFn: () => stadiumApi.getQuote(stadium!.id, { date: selectedDate, start_time: selectedStart, end_time: selectedEnd }),
    enabled: !!stadium && !!selectedDate && !!selectedStart && !!selectedEnd,
  });

  const { data: stadiumTrainings = [] } = useQuery<Training[]>({
    queryKey: ["stadium-trainings", stadium?.id],
    queryFn: () => trainingApi.getAll({ stadium_id: stadium!.id, limit: 20 }),
    enabled: !!stadium,
  });

  const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

  // Generate next 7 days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = formatLocalDate(d);
    const dayNames = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];
    const dayName = dayNames[(d.getDay() + 6) % 7];
    return { iso, dayName, dayNum: d.getDate(), monthName: monthNames[d.getMonth()] };
  });

  const toggleBooking = () => {
    if (!user?.phone) {
      showAlert("Bron qilish uchun avval telefon raqamingizni ulashing. Profil bo'limiga o'ting.");
      return;
    }
    setShowBooking((prev) => !prev);
  };

  useEffect(() => {
    if (showBooking && bookingRef.current) {
      bookingRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showBooking]);

  const handleBook = async () => {
    if (!stadium || !selectedDate || !selectedStart || !selectedEnd) return;
    try {
      await bookingApi.create({
        stadium_id: stadium.id,
        date: selectedDate,
        start_time: selectedStart,
        end_time: selectedEnd,
      });
      showAlert("Bron muvaffaqiyatli yaratildi!");
      router.push("/miniapp/bookings");
    } catch (error) {
      showAlert(getBookingErrorMessage(error));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedStart("");
    setSelectedEnd("");
  };

  const handleTimeSelect = (time: string) => {
    const firstValidDuration = [1, 2, 3].find((d) => isDurationAvailable(time, d));
    if (!firstValidDuration) return;
    setSelectedStart(time);
    setDuration(firstValidDuration);
    const [h] = time.split(":").map(Number);
    setSelectedEnd(`${(h + firstValidDuration).toString().padStart(2, "0")}:00`);
  };

  const handleDurationChange = (d: number) => {
    if (!isDurationAvailable(selectedStart, d)) return;
    setDuration(d);
    if (selectedStart) {
      const [h] = selectedStart.split(":").map(Number);
      setSelectedEnd(`${(h + d).toString().padStart(2, "0")}:00`);
    }
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const selectedDateIsToday = () => selectedDate === formatLocalDate(new Date());

  const hasMinimumLeadTime = (time: string) => {
    if (!selectedDateIsToday()) return true;
    const now = new Date();
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    return slotStart.getTime() - now.getTime() >= 10 * 60 * 1000;
  };

  const isSlotBookable = (slot: { time: string; available: boolean }) => slot.available && hasMinimumLeadTime(slot.time);

  const isDurationAvailable = (startTime: string, hours: number) => {
    if (!startTime || !availability?.slots || !stadium?.close_time) return false;
    const start = timeToMinutes(startTime);
    const end = start + hours * 60;
    if (end > timeToMinutes(stadium.close_time)) return false;

    for (let offset = 0; offset < hours; offset += 1) {
      const slotTime = `${Math.floor((start + offset * 60) / 60).toString().padStart(2, "0")}:00`;
      const slot = availability.slots.find((item: { time: string; available: boolean }) => item.time === slotTime);
      if (!slot || !isSlotBookable(slot)) return false;
    }

    return true;
  };

  const workingDaysStr = stadium?.working_days?.length
    ? (stadium.working_days.length >= 6 ? "Har kuni" : "Du — Ya")
    : "—";

  if (isLoading) {
    return (
      <div className="mini-loader" style={{ height: '100dvh' }}>
        <div className="mini-loader-spinner" />
        <div>Yuklanmoqda...</div>
      </div>
    );
  }

  if (!stadium) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', fontSize: 15, fontWeight: 600, color: 'var(--mini-muted)' }}>
        Stadion topilmadi
      </div>
    );
  }

  return (
    <div style={{ marginTop: -18, marginLeft: -16, marginRight: -16, paddingBottom: 160 }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', height: 260, overflow: 'hidden', background: '#111', borderRadius: '0 0 28px 28px' }}>
        {stadium.cover_image ? (
          <img
            src={getImageUrl(stadium.cover_image)}
            alt={stadium.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', animation: 'heroZoom 18s ease-out forwards' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #38d46a 0%, #007aff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={72} color="rgba(255,255,255,0.2)" />
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, transparent 40%, rgba(0,0,0,0.85) 100%)' }} />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{ position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(12px)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
        >
          <ArrowLeft size={20} />
        </button>

        {/* Rating badge */}
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(12px)', color: 'white', fontSize: 13, fontWeight: 700, zIndex: 10 }}>
          <Star size={13} fill="#facc15" color="#facc15" />
          {stadium.rating.toFixed(1)}
        </div>

        {/* Title + address */}
        <div style={{ position: 'absolute', bottom: 20, left: 18, right: 18, zIndex: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1.15, margin: '0 0 6px', letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            {stadium.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: 500 }}>
            <MapPin size={13} />
            <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{stadium.address}</span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="mini-responsive-grid-2" style={{ margin: '14px 16px 0', gap: 8 }}>
        <StatBox label="Narx" value={formatPrice(stadium.price_per_hour)} sub="/ soat" color="#34c759" />
        <StatBox label="Vaqt" value={`${stadium.open_time ?? '—'} – ${stadium.close_time ?? '—'}`} sub={workingDaysStr} color="#007aff" />
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* About */}
        {stadium.description && (
          <Section label="Haqida">
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--mini-text)', margin: 0 }}>{stadium.description}</p>
          </Section>
        )}



        {/* Schedule + Contact — merged into rows */}
        <Section label="Jadval va Aloqa">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <InfoRow icon={<CalendarCheck size={17} />} label="Ish kunlari" value={workingDaysStr} />
            <InfoRow icon={<Clock size={17} />} label="Ish vaqti" value={`${stadium.open_time ?? '—'} – ${stadium.close_time ?? '—'}`} />
            <InfoRow icon={<MapPin size={17} />} label="Manzil" value={stadium.address} />
            <InfoRow
              icon={<Phone size={17} />}
              label={stadium.phone2 ? "Telefonlar" : "Telefon"}
              value={`${stadium.phone}${stadium.phone2 ? `, ${stadium.phone2}` : ''}`}
            />
          </div>
          {stadium.latitude && stadium.longitude && (
            <a
              href={`https://maps.google.com/?q=${stadium.latitude},${stadium.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', borderRadius: 14, background: 'rgba(0,122,255,0.10)', color: '#007aff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
            >
              <Navigation size={16} />
              Xaritada ko'rish
              <ExternalLink size={14} />
            </a>
          )}
        </Section>

        {/* Trainings at this venue */}
        {stadiumTrainings.length > 0 && (
          <Section label="Mashg'ulotlar">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stadiumTrainings.map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push(`/miniapp/trainings/${t.slug}`)}
                  className="mini-pressable"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 14, border: "1px solid var(--mini-line)", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <span className="mini-glyph mini-glyph-blue" style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0 }}>
                    <Dumbbell size={17} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--mini-text)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{t.title}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--mini-muted)", marginTop: 2 }}>
                      {[sportLabel(t.sport), t.schedule_text].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <ChevronRight size={16} style={{ color: "var(--mini-faint)", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Gallery */}
        {stadium.images && stadium.images.length > 0 && (
          <Section label="Rasmlar">
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginLeft: -1, paddingBottom: 2 }}
              className="hide-scrollbar">
              {stadium.images.map((img: string, i: number) => (
                <img
                  key={i}
                  src={getImageUrl(img)}
                  alt={`${stadium.name} ${i + 1}`}
                  style={{ width: 160, height: 110, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Booking form */}
        <div ref={bookingRef}>
          {showBooking && (
            <Section label="Bron qilish" accent>
              {/* ── 7-day week vertical ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {weekDays.map((day) => {
                  const isSel = selectedDate === day.iso;
                  return (
                    <div key={day.iso}>
                      <button
                        onClick={() => handleDateChange({ target: { value: day.iso } } as any)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 16,
                          border: isSel ? 'none' : '1px solid var(--mini-line)',
                          background: isSel ? '#34c759' : 'rgba(118,118,128,0.07)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          boxShadow: isSel ? '0 6px 16px rgba(52,199,89,0.30)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: isSel ? 'rgba(255,255,255,0.9)' : 'var(--mini-text)' }}>
                            {day.dayName}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, color: isSel ? 'white' : 'var(--mini-text)', letterSpacing: '-0.02em' }}>
                            {day.dayNum}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: isSel ? 'rgba(255,255,255,0.7)' : 'var(--mini-muted)' }}>
                            {day.monthName}
                          </span>
                        </div>
                      </button>

                      {isSel && availability && (
                        <div style={{ marginTop: 8, paddingLeft: 4, paddingRight: 4 }}>
                          {availability.slots && availability.slots.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                              {availability.slots.map((slot: { time: string; available: boolean }) => {
                                const bookable = isSlotBookable(slot);
                                const isTimeSel = slot.time === selectedStart;
                                return (
                                  <button
                                    key={slot.time}
                                    disabled={!bookable}
                                    onClick={() => bookable && handleTimeSelect(slot.time)}
                                    style={{
                                      padding: '10px 4px',
                                      borderRadius: 12,
                                      border: 'none',
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: bookable ? 'pointer' : 'default',
                                      background: isTimeSel ? '#34c759' : bookable ? 'rgba(118,118,128,0.10)' : 'transparent',
                                      color: isTimeSel ? '#fff' : bookable ? 'var(--mini-text)' : 'var(--mini-faint)',
                                      textDecoration: !bookable ? 'line-through' : 'none',
                                      opacity: !bookable ? 0.38 : 1,
                                      boxShadow: isTimeSel ? '0 6px 14px rgba(52,199,89,0.32)' : 'none',
                                    }}
                                  >
                                    {slot.time}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ padding: '16px', textAlign: 'center', borderRadius: 14, background: 'rgba(118,118,128,0.08)', color: 'var(--mini-muted)', fontSize: 14 }}>
                              Bu sana uchun bo'sh vaqt yo'q
                            </div>
                          )}
                        </div>
                      )}

                      {isSel && selectedStart && (
                        <>
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingLeft: 4, paddingRight: 4 }}>
                            {[1, 2, 3].map((d) => {
                              const available = isDurationAvailable(selectedStart, d);
                              return (
                              <button
                                key={d}
                                disabled={!available}
                                onClick={() => handleDurationChange(d)}
                                style={{
                                  flex: 1,
                                  padding: '10px 0',
                                  borderRadius: 12,
                                  border: 'none',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  cursor: available ? 'pointer' : 'default',
                                  background: duration === d ? '#34c759' : available ? 'rgba(118,118,128,0.10)' : 'transparent',
                                  color: duration === d ? '#fff' : available ? 'var(--mini-text)' : 'var(--mini-faint)',
                                  opacity: available ? 1 : 0.38,
                                  textDecoration: available ? 'none' : 'line-through',
                                  boxShadow: duration === d ? '0 6px 14px rgba(52,199,89,0.32)' : 'none',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {d} soat
                              </button>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 14, background: 'rgba(52,199,89,0.10)', border: '1px solid rgba(52,199,89,0.22)', marginTop: 10, marginLeft: 4, marginRight: 4 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(52,199,89,0.8)' }}>Tanlangan</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#34c759' }}>{selectedDate} • {selectedStart} — {selectedEnd}</div>
                              <div style={{ fontSize: 17, fontWeight: 900, color: '#34c759' }}>{formatPrice(quote?.total_price ?? stadium.price_per_hour * duration)}</div>
                          </div>
                          <button
                            onClick={handleBook}
                            className="mini-button-primary"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, width: '100%' }}
                          >
                            <CircleCheck size={20} />
                            Bronni tasdiqlash
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* ── Sticky bottom price ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: 'var(--mini-surface-solid)',
          borderTop: '1px solid var(--mini-line)',
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: '#34c759' }}>
            {formatPrice(stadium.price_per_hour)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, marginTop: 3, color: 'var(--mini-muted)' }}>soatiga</div>
        </div>
        <button
          onClick={toggleBooking}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '12px 20px',
            borderRadius: 16,
            border: 'none',
            background: 'linear-gradient(180deg, #38d46a 0%, #30b95b 100%)',
            color: 'white',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 18px rgba(52,199,89,0.32)',
            flexShrink: 0,
          }}
        >
          {showBooking ? <ChevronDown size={18} /> : <CalendarCheck size={18} />}
          {showBooking ? "Yopish" : "Bron qilish"}
        </button>
      </div>

      <style>{`
        @keyframes heroZoom { 0% { transform:scale(1); } 100% { transform:scale(1.08); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .hide-scrollbar::-webkit-scrollbar { display:none; }
        .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--mini-surface-solid)',
      border: '1px solid var(--mini-line)',
      borderRadius: 20,
      overflow: 'hidden',
    }}>
      {/* Section header */}
      <div style={{
        padding: '10px 16px 8px',
        borderBottom: '1px solid var(--mini-line)',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: accent ? '#34c759' : 'var(--mini-muted)',
      }}>
        {label}
      </div>
      {/* Section body */}
      <div style={{ padding: '14px 16px' }}>
        {children}
      </div>
    </div>
  );
}

function getBookingErrorMessage(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => typeof item?.msg === "string" ? item.msg : "Bron qilishda xatolik yuz berdi").join(". ");
  }
  return "Bron qilishda xatolik yuz berdi";
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: 'var(--mini-surface-solid)',
      border: '1px solid var(--mini-line)',
      borderRadius: 18,
      padding: '12px 10px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mini-muted)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--mini-faint)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--mini-line)' }}
      className="info-row-last">
      <div style={{ color: 'var(--mini-faint)', flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mini-faint)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mini-text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </div>
  );
}
