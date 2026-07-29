"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { OwnerButton, OwnerCard, OwnerInput } from "@/components/owner/OwnerShell";

export default function OwnerLoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [ownerLogin, setOwnerLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          <p style={{ color: "#627064", marginTop: 6 }}>Superadmin bergan login va vaqtinchalik parol bilan kiring.</p>
        </div>
        {error ? <div style={{ background: "rgba(255,59,48,0.1)", color: "#d82d24", borderRadius: 14, padding: 12, marginBottom: 14, fontSize: 14, fontWeight: 700 }}>{error}</div> : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <OwnerInput placeholder="owner login" value={ownerLogin} onChange={(e) => setOwnerLogin(e.target.value)} required />
          <OwnerInput placeholder="parol" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <OwnerButton type="submit" disabled={loading}>{loading ? "Tekshirilmoqda..." : "Kabinetga kirish"}</OwnerButton>
        </form>
      </OwnerCard>
    </div>
  );
}
