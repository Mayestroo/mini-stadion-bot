"use client";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import { useAuthStore } from "@/store/auth";
import { LogOut, Phone, ShieldCheck } from "lucide-react";

export default function MiniProfilePage() {
  const { user: tgUser, theme, close } = useTelegram();
  const { user, logout } = useAuthStore();

  const textSec = theme === "dark" ? "#8e8e93" : "#6e6e73";

  return (
    <div>
      <div className="mini-title-row">
        <div>
          <div className="mini-eyebrow">Hisob</div>
          <h1 className="mini-large-title">Profil</h1>
        </div>
      </div>

      <div className="mini-card" style={{ padding: 20, marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
        <div className="mini-glyph" style={{ width: 58, height: 58, borderRadius: 22, fontSize: 23, fontWeight: 800, flexShrink: 0 }}>
          {(user?.full_name || tgUser?.first_name || "?")[0]}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 780, letterSpacing: "-0.02em" }}>{user?.full_name || tgUser?.first_name || "—"}</div>
          <div style={{ fontSize: 13, color: textSec }}>{tgUser?.username ? `@${tgUser.username}` : "—"}</div>
        </div>
      </div>

      <div className="mini-card-solid" style={{ padding: "8px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--mini-line)" }}>
          <Phone size={16} color={textSec} />
          <div>
            <div style={{ fontSize: 12, color: textSec }}>Telefon</div>
            <div style={{ fontSize: 15, fontWeight: 650 }}>{user?.phone || "—"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
          <ShieldCheck size={16} color={textSec} />
          <div>
            <div style={{ fontSize: 12, color: textSec }}>Rol</div>
            <div style={{ fontSize: 15, fontWeight: 650 }}>{user?.role === "moderator" ? "Moderator" : user?.role === "superadmin" ? "Super Admin" : user?.role === "owner" ? "Owner" : "Foydalanuvchi"}</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => { logout(); close(); }}
        className="mini-pressable"
        style={{ width: "100%", padding: 14, borderRadius: 17, border: "1px solid rgba(255,59,48,0.35)", backgroundColor: "rgba(255,59,48,0.08)", color: "var(--mini-red)", fontSize: 15, fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <LogOut size={16} /> Chiqish
      </button>
    </div>
  );
}
