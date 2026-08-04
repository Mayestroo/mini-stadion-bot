"use client";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import PhoneRequest from "@/components/miniapp/PhoneRequest";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { stadiumApi } from "@/lib/api";
import { MiniStadiumCard } from "@/components/miniapp/MiniStadiumCard";
import { ShieldCheck } from "lucide-react";

export default function MiniAppHome() {
  const router = useRouter();
  const { ready } = useTelegram();
  const { isAuthenticated, user, hydrated } = useAuthStore();
  const isAdminRole = user?.role === "superadmin" || user?.role === "moderator";

  const { data: stadiums = [] } = useQuery({
    queryKey: ["miniapp-stadiums"],
    queryFn: () => stadiumApi.getAll({ limit: 5, featured: true }),
    enabled: isAuthenticated,
  });

  if (!ready || !hydrated) {
    return (
      <div className="mini-loader">
        <div className="mini-loader-spinner" />
        <div>Yuklanmoqda...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PhoneRequest />;
  }

  return (
    <div>

      {isAdminRole && (
        <div className="mini-card" style={{ padding: 16, marginBottom: 18, border: "1px solid rgba(0,122,255,0.22)" }}>
          <div className="mini-eyebrow">Boshqaruv access</div>
          <h1 style={{ fontSize: 25, fontWeight: 850, letterSpacing: "-0.03em", marginBottom: 6 }}>
            {user?.role === "superadmin" ? "Superadmin panel" : "Moderator panel"}
          </h1>
          <p className="mini-subtitle" style={{ marginBottom: 14 }}>
            {user?.role === "superadmin"
              ? "Statistika, userlar, moderatsiya va bronlarni boshqarish."
              : "Stadionlar va bronlarni operatsion boshqarish."}
          </p>
          <ActionCard
            icon={<ShieldCheck size={22} />}
            title="Admin panelga o'tish"
            subtitle={user?.role === "superadmin" ? "To'liq boshqaruv" : "Moderator boshqaruvi"}
            onClick={() => router.push("/admin")}
            tone="blue"
          />
        </div>
      )}

      {user?.role === "owner" && (
        <div className="mini-card" style={{ padding: 16, marginBottom: 18 }}>
          <div className="mini-eyebrow">Owner access</div>
          <h1 style={{ fontSize: 25, fontWeight: 850, letterSpacing: "-0.03em", marginBottom: 6 }}>Owner kabinet</h1>
          <p className="mini-subtitle" style={{ marginBottom: 14 }}>Siz stadion egasi sifatida tanildingiz. Stadionlaringizni owner kabinetda boshqaring.</p>
          <ActionCard icon={<ShieldCheck size={22} />} title="Owner kabinetga o'tish" subtitle="Telegram orqali avtomatik kirish" onClick={() => router.push("/owner")} tone="blue" />
        </div>
      )}

      {/* Asosiy bo'limlarga o'tish tabbar'da — bu yerda alohida cardlar kerak emas. */}

      <div className="mini-title-row">
        <div>
          <div className="mini-eyebrow">Tavsiya etiladi</div>
          <h2 style={{ fontSize: 22, fontWeight: 780, letterSpacing: "-0.02em" }}>Top stadionlar</h2>
        </div>
        <button onClick={() => router.push("/miniapp/stadiums")} style={{ border: 0, background: "transparent", color: "var(--mini-green)", fontWeight: 700 }}>Hammasi</button>
      </div>

      <div className="mini-list">
        {stadiums.slice(0, 3).map((s: any) => (
          <MiniStadiumCard key={s.id} stadium={s} onClick={() => router.push(`/miniapp/stadiums/${s.slug}`)} />
        ))}
      </div>
    </div>
  );
}

function ActionCard({ icon, title, subtitle, onClick, tone }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void; tone: "green" | "blue" }) {
  return (
    <button onClick={onClick} className="mini-card-solid mini-pressable" style={{ width: "100%", minWidth: 0, border: 0, cursor: "pointer", padding: 15, textAlign: "left", color: "var(--mini-text)" }}>
      <div className={`mini-glyph ${tone === "blue" ? "mini-glyph-blue" : ""}`} style={{ marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 760 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--mini-muted)", marginTop: 2 }}>{subtitle}</div>
    </button>
  );
}
