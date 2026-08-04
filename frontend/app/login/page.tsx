"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, safeRedirect } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mini-loader" style={{ minHeight: "100vh" }}><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authApi.login({ phone, password });
      login(data.user);
      router.push(safeRedirect(searchParams.get("redirect")));
    } catch (err: any) {
      setError(err.response?.data?.detail || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-bg-secondary)" }}>
      <div style={{ backgroundColor: "var(--color-surface)", borderRadius: "var(--radius-xl)", padding: 40, width: "100%", maxWidth: 400, boxShadow: "var(--shadow-md)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ fontSize: 32, textDecoration: "none" }}>⚽</Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 12, color: "var(--color-text-primary)" }}>Kirish</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>Hisobingizga kiring</p>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", backgroundColor: "var(--color-error)", color: "white", borderRadius: "var(--radius-md)", marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" }}>Telefon</label>
            <input
              type="tel"
              placeholder="+998901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border)", fontSize: 15, outline: "none" }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" }}>Parol</label>
            <input
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border)", fontSize: 15, outline: "none" }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: loading ? "var(--color-accent-hover)" : "var(--color-accent)", color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
          >
            {loading ? "Kutilmoqda..." : "Kirish"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Hisobingiz yo'qmi? </span>
          <Link href="/register" style={{ fontSize: 14, color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}>Ro'yxatdan o'tish</Link>
        </div>
      </div>
    </div>
  );
}
