"use client";
import { getImageUrl, trainingApi } from "@/lib/api";
import { Training } from "@/lib/types";
import { ageGroupLabel, sportLabel } from "@/lib/sports";
import { googleMapsUrl, yandexMapsUrl } from "@/lib/maps";
import { MapButtons } from "@/components/miniapp/MapButtons";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  AtSign,
  CalendarDays,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Send,
  User,
  Warehouse,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function MiniTrainingDetail() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: training, isLoading } = useQuery<Training>({
    queryKey: ["miniapp-training", slug],
    queryFn: () => trainingApi.getOne(slug),
    enabled: !!slug,
  });

  const trackContact = () => {
    trainingApi.contactClick(slug).catch(() => {});
  };

  if (isLoading) {
    return (
      <div className="mini-loader" style={{ height: "100dvh" }}>
        <div className="mini-loader-spinner" />
        <div>Yuklanmoqda...</div>
      </div>
    );
  }

  if (!training) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", fontSize: 15, fontWeight: 600, color: "var(--mini-muted)" }}>
        Mashg'ulot topilmadi
      </div>
    );
  }

  const telegramUrl = training.telegram
    ? training.telegram.startsWith("http")
      ? training.telegram
      : `https://t.me/${training.telegram.replace(/^@/, "")}`
    : null;
  const instagramUrl = training.instagram
    ? training.instagram.startsWith("http")
      ? training.instagram
      : `https://instagram.com/${training.instagram.replace(/^@/, "")}`
    : null;

  return (
    <div style={{ marginTop: -18, marginLeft: -16, marginRight: -16, paddingBottom: 170 }}>
      {/* ── Hero ── */}
      <div style={{ position: "relative", height: 260, overflow: "hidden", background: "#111", borderRadius: "0 0 28px 28px" }}>
        {training.cover_image ? (
          <img
            src={getImageUrl(training.cover_image)}
            alt={training.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #38d46a 0%, #007aff 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CalendarDays size={72} color="rgba(255,255,255,0.2)" />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, transparent 40%, rgba(0,0,0,0.85) 100%)" }} />

        <button
          onClick={() => router.back()}
          style={{ position: "absolute", top: 16, left: 16, width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.44)", backdropFilter: "blur(12px)", border: "none", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}
          aria-label="Orqaga"
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ position: "absolute", top: 16, right: 16, padding: "6px 12px", borderRadius: 999, background: "rgba(0,0,0,0.44)", backdropFilter: "blur(12px)", color: "white", fontSize: 13, fontWeight: 700, zIndex: 10 }}>
          {sportLabel(training.sport)}
        </div>

        <div style={{ position: "absolute", bottom: 20, left: 18, right: 18, zIndex: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1.15, margin: "0 0 6px", letterSpacing: "-0.03em", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
            {training.title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: 500 }}>
            <MapPin size={13} />
            <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{training.address}</span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "14px 16px 0" }}>
        <StatBox label="Narx" value={training.price_text || "—"} sub="o'stilishi mumkin" color="#34c759" />
        <StatBox label="Yosh guruhi" value={ageGroupLabel(training.age_group)} sub={sportLabel(training.sport)} color="#007aff" />
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {training.description && (
          <Section label="Haqida">
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--mini-text)", margin: 0 }}>{training.description}</p>
          </Section>
        )}

        <Section label="Jadval va joylashuv">
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {training.coach_name ? <InfoRow icon={<User size={17} />} label="Murabbiy" value={training.coach_name} /> : null}
            {training.schedule_text ? <InfoRow icon={<Clock size={17} />} label="Jadval" value={training.schedule_text} /> : null}
            <InfoRow icon={<MapPin size={17} />} label="Manzil" value={training.address} />
            {training.district ? <InfoRow icon={<MapPin size={17} />} label="Tuman" value={training.district} /> : null}
          </div>
          {/* Trainings carry only lat/lng — both provider links are built locally. */}
          {training.latitude && training.longitude ? (
            <MapButtons
              googleUrl={googleMapsUrl(training.latitude, training.longitude)}
              yandexUrl={yandexMapsUrl(training.latitude, training.longitude)}
            />
          ) : null}
        </Section>

        {training.stadium_slug && training.stadium_name && (
          <Section label="O'tkaziladigan joy">
            <button
              onClick={() => router.push(`/miniapp/stadiums/${training.stadium_slug}`)}
              className="mini-pressable"
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "1px solid var(--mini-line)", borderRadius: 16, padding: "12px 14px", background: "transparent", cursor: "pointer", textAlign: "left" }}
            >
              <span className="mini-glyph" style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0 }}>
                <Warehouse size={20} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 750, color: "var(--mini-text)" }}>{training.stadium_name}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--mini-muted)", marginTop: 2 }}>Stadion sahifasini ochish</span>
              </span>
              <ExternalLink size={15} style={{ marginLeft: "auto", color: "var(--mini-faint)", flexShrink: 0 }} />
            </button>
          </Section>
        )}

        {training.images && training.images.length > 0 && (
          <Section label="Rasmlar">
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginLeft: -1, paddingBottom: 2 }} className="hide-scrollbar">
              {training.images.map((img: string, i: number) => (
                <img
                  key={i}
                  src={getImageUrl(img)}
                  alt={`${training.title} ${i + 1}`}
                  style={{ width: 160, height: 110, borderRadius: 14, objectFit: "cover", flexShrink: 0 }}
                />
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* ── Sticky contact bar ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: "var(--mini-surface-solid)",
          borderTop: "1px solid var(--mini-line)",
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--mini-muted)", textAlign: "center" }}>
          Mashg'ulotga yozilish uchun bevosita bog'laning
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`tel:${training.phone}`}
            onClick={trackContact}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "13px 10px",
              borderRadius: 16,
              background: "linear-gradient(180deg, #38d46a 0%, #30b95b 100%)",
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 8px 18px rgba(52,199,89,0.32)",
            }}
          >
            <Phone size={18} />
            Qo'ng'iroq
          </a>
          {telegramUrl && (
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackContact}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "13px 10px",
                borderRadius: 16,
                background: "var(--mini-blue)",
                color: "white",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <Send size={18} />
              Telegram
            </a>
          )}
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackContact}
              style={{
                width: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                background: "rgba(255,59,48,0.12)",
                color: "var(--mini-red)",
                textDecoration: "none",
              }}
              aria-label="Instagram"
            >
              <AtSign size={19} />
            </a>
          )}
        </div>
      </div>

      <style>{`.hide-scrollbar::-webkit-scrollbar { display:none; } .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }`}</style>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--mini-surface-solid)",
        border: "1px solid var(--mini-line)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px 8px",
          borderBottom: "1px solid var(--mini-line)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--mini-muted)",
        }}
      >
        {label}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      style={{
        background: "var(--mini-surface-solid)",
        border: "1px solid var(--mini-line)",
        borderRadius: 18,
        padding: "12px 10px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mini-muted)", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 500, color: "var(--mini-faint)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--mini-line)" }}>
      <div style={{ color: "var(--mini-faint)", flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mini-faint)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--mini-text)", overflowWrap: "anywhere" }}>{value}</div>
      </div>
    </div>
  );
}
