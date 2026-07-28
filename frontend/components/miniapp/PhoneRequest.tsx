"use client";
import { useState, useEffect } from "react";
import { useTelegram } from "@/components/miniapp/TelegramProvider";
import { useAuthStore } from "@/store/auth";
import { authTelegram } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ContactRound } from "lucide-react";

export default function PhoneRequest() {
  const router = useRouter();
  const { theme, requestContact, user: tgUser, initData } = useTelegram();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tgUser && initData) {
      authTelegram({ init_data: initData }).then((data) => {
        if (data.user.phone) {
          login(data.user, data.access_token);
          router.replace("/miniapp");
        }
      }).catch(() => {});
    }
  }, [login, router, tgUser, initData]);

  const textSec = theme === "dark" ? "#8e8e93" : "#6e6e73";

  const handleRequest = async () => {
    if (!tgUser) {
      setError("Telegram foydalanuvchi ma'lumoti topilmadi. Mini Appni Telegram ichida oching.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const contact = await requestContact();
      if (!contact?.phone_number) {
        setError("Telefon raqam ulashish rad etildi. Bron qilish uchun telefon raqam kerak.");
        return;
      }

      const data = await authTelegram({
        init_data: initData,
        phone: contact.phone_number,
      });
      login(data.user, data.access_token);
      router.replace("/miniapp");
    } catch {
      setError("Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100dvh - 130px)", display: "flex", alignItems: "center" }}>
      <div
        className="mini-card"
        style={{ width: "100%", padding: "28px 22px 22px", textAlign: "center" }}
      >
        <div className="mini-glyph" style={{ width: 86, height: 86, borderRadius: 28, margin: "0 auto 22px" }}>
          <ContactRound size={42} strokeWidth={2.35} />
        </div>

        <div className="mini-eyebrow">Sportly</div>
        <h2 className="mini-large-title" style={{ fontSize: 30 }}>Ro'yxatdan o'tish</h2>
        <p className="mini-subtitle" style={{ marginBottom: 22 }}>
          Bron qilish uchun Telegram kontakt ulashish funksiyasi orqali telefon raqamingizni tasdiqlang.
        </p>

        <button onClick={handleRequest} disabled={loading} className="mini-button-primary mini-pressable">
          {loading ? "Ro'yxatdan o'tilmoqda..." : "Kontaktni ulashish"}
        </button>

        <p style={{ fontSize: 12, color: textSec, marginTop: 13, lineHeight: 1.4 }}>
          Raqamingiz faqat bronlarni tasdiqlash uchun ishlatiladi.
        </p>

        {error && (
          <p style={{ fontSize: 13, color: "#ff3b30", marginTop: 16, lineHeight: 1.4 }}>{error}</p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
