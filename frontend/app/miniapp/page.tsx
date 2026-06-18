"use client";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import PhoneRequest from "@/components/miniapp/PhoneRequest";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { stadiumApi } from "@/lib/api";
import { MiniStadiumCard } from "@/components/miniapp/MiniStadiumCard";
import { CalendarCheck, MapPinned, ShieldCheck } from "lucide-react";

export default function MiniAppHome() {
  const router = useRouter();
  const { theme, ready } = useTelegram();
  const { isAuthenticated, user, hydrated } = useAuthStore();
  const isAdminRole = user?.role === "superadmin" || user?.role === "moderator";

  const { data: stadiums = [] } = useQuery({
    queryKey: ["miniapp-stadiums"],
    queryFn: () => stadiumApi.getAll({ limit: 5, featured: true }),
    enabled: isAuthenticated,
  });

  const textSec = theme === "dark" ? "#8e8e93" : "#6e6e73";

  if (!ready || !hydrated) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: textSec }}>
        <div style={{ width: 40, height: 40, borderRadius: 20, border: "3px solid var(--mini-green)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p>Yuklanmoqda...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PhoneRequest />;
  }

  if (isAdminRole) {
    return (
      <div>
        <div className="mini-card" style={{ padding: 16, border: "1px solid rgba(0,122,255,0.22)" }}>
          <div className="mini-eyebrow">Boshqaruv access</div>
          <h1 style={{ fontSize: 25, fontWeight: 850, letterSpacing: "-0.03em", marginBottom: 6 }}>
            {user.role === "superadmin" ? "Superadmin panel" : "Moderator panel"}
          </h1>
          <p className="mini-subtitle" style={{ marginBottom: 14 }}>
            {user.role === "superadmin"
              ? "Statistika, ownerlar, moderatsiya va bronlarni boshqarish."
              : "Stadionlar va bronlarni operatsion boshqarish."}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            <ActionCard
              icon={<ShieldCheck size={22} />}
              title="Admin panelga o'tish"
              subtitle={user.role === "superadmin" ? "To'liq boshqaruv" : "Moderator boshqaruvi"}
              onClick={() => router.push("/admin")}
              tone="blue"
            />
            <ActionCard icon={<MapPinned size={22} />} title="Foydalanuvchi sifatida ko'rish" subtitle="Stadionlar va bron" onClick={() => router.push("/miniapp/stadiums")} tone="green" />
          </div>
        </div>

        <p style={{ color: "var(--mini-muted)", fontSize: 13, lineHeight: 1.45, margin: "14px 4px 0" }}>
          Oddiy foydalanuvchi sahifalarini ko'rish uchun yuqoridagi alohida tugmadan foydalaning.
        </p>
      </div>
    );
  }

  return (
    <div>

      {user?.role === "owner" && (
        <div className="mini-card" style={{ padding: 16, marginBottom: 18 }}>
          <div className="mini-eyebrow">Owner access</div>
          <h1 style={{ fontSize: 25, fontWeight: 850, letterSpacing: "-0.03em", marginBottom: 6 }}>Kabinet tanlang</h1>
          <p className="mini-subtitle" style={{ marginBottom: 14 }}>Siz stadion egasi sifatida tanildingiz. Oddiy foydalanuvchi ko'rinishi yoki owner kabinetga o'ting.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <ActionCard icon={<MapPinned size={22} />} title="Foydalanuvchi sifatida ko'rish" subtitle="Stadionlar va bron" onClick={() => router.push("/miniapp/stadiums")} tone="green" />
            <ActionCard icon={<ShieldCheck size={22} />} title="Owner kabinet" subtitle="Login/parol bilan kirish" onClick={() => router.push("/owner/login")} tone="blue" />
          </div>
        </div>
      )}

      <div className="mini-responsive-grid-2" style={{ marginBottom: 22 }}>
        <ActionCard icon={<MapPinned size={22} />} title="Stadionlar" subtitle="Yaqindagilar" onClick={() => router.push("/miniapp/stadiums")} tone="green" />
        <ActionCard icon={<CalendarCheck size={22} />} title="Bronlarim" subtitle="Rejalar" onClick={() => router.push("/miniapp/bookings")} tone="blue" />
      </div>

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
    <button onClick={onClick} className="mini-card-solid mini-pressable" style={{ border: 0, cursor: "pointer", padding: 15, textAlign: "left", color: "var(--mini-text)" }}>
      <div className={`mini-glyph ${tone === "blue" ? "mini-glyph-blue" : ""}`} style={{ marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 760 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--mini-muted)", marginTop: 2 }}>{subtitle}</div>
    </button>
  );
}
