"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, authTelegram } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { OwnerButton, OwnerCard, OwnerInput } from "@/components/owner/OwnerShell";

export default function OwnerLoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated, login } = useAuthStore();
  const [ownerLogin, setOwnerLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tgBusy, setTgBusy] = useState(false);
  const tgTried = useRef(false);

  // Already authenticated as owner (e.g. opened from the mini-app with a live
  // session) — the credential form is pointless, go straight to the cabinet.
  useEffect(() => {
    if (hydrated && isAuthenticated && user?.role === "owner") {
      router.replace(user.must_change_password ? "/owner/change-password" : "/owner");
    }
  }, [hydrated, isAuthenticated, user, router]);

  // Telegram-ID based owners have no login/password: inside the mini-app,
  // silently authenticate with the signed initData before falling back to
  // the credential form.
  useEffect(() => {
    if (!hydrated || isAuthenticated || tgTried.current) return;
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    const initData = tg?.initData || "";
    if (!tgUser || !initData) return;
    tgTried.current = true;
    setTgBusy(true);
    authTelegram({ init_data: initData })
      .then((data) => {
        login(data.user);
        if (data.user.role === "owner") {
          router.replace(data.user.must_change_password ? "/owner/change-password" : "/owner");
        } else {
          setError("Bu Telegram hisobida owner huquqi yo'q");
        }
      })
      .catch(() => {
        // Fall through to the credential form.
      })
      .finally(() => setTgBusy(false));
  }, [hydrated, isAuthenticated, login, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.ownerLogin({ owner_login: ownerLogin, password });
      login(data.user);
      router.push(data.user.must_change_password ? "/owner/change-password" : "/owner");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg, #07140d 0%, #0b331b 46%, #f2f7f3 46%)", display: "grid", placeItems: "center", padding: 18 }}>
      <OwnerCard style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#19b95a", letterSpacing: "0.09em", textTransform: "uppercase" }}>Owner kabinet</div>
          <h1 style={{ fontSize: 30, fontWeight: 950, letterSpacing: "-0.05em", marginTop: 6 }}>Stadion boshqaruvi</h1>
          <p style={{ color: "#627064", marginTop: 6 }}>Telegram orqali avtomatik kiriladi yoki berilgan login/parol bilan kiring.</p>
        </div>
        {tgBusy ? <div style={{ background: "rgba(25,185,90,0.08)", color: "#0e7a38", borderRadius: 14, padding: 12, marginBottom: 14, fontSize: 14, fontWeight: 700 }}>Telegram orqali tekshirilmoqda...</div> : null}
        {error ? <div style={{ background: "rgba(255,59,48,0.1)", color: "#d82d24", borderRadius: 14, padding: 12, marginBottom: 14, fontSize: 14, fontWeight: 700 }}>{error}</div> : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <OwnerInput placeholder="owner login" value={ownerLogin} onChange={(e) => setOwnerLogin(e.target.value)} required />
          <OwnerInput placeholder="parol" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <OwnerButton type="submit" disabled={loading || tgBusy}>{loading ? "Tekshirilmoqda..." : "Kabinetga kirish"}</OwnerButton>
        </form>
      </OwnerCard>
    </div>
  );
}
