"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, safeRedirect } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mini-loader" style={{ minHeight: "100vh" }}><div className="mini-loader-spinner" /><div>Yuklanmoqda...</div></div>}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ full_name: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authApi.register({
        full_name: form.full_name,
        phone: form.phone,
        password: form.password,
      });
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
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 12, color: "var(--color-text-primary)" }}>Ro'yxatdan o'tish</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 4 }}>Yangi hisob yarating</p>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", backgroundColor: "var(--color-error)", color: "white", borderRadius: "var(--radius-md)", marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" }}>To'liq ism</label>
            <input
              type="text"
              placeholder="Ali Valiyev"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border)", fontSize: 15, outline: "none" }}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" }}>Telefon</label>
            <input
              type="tel"
              placeholder="+998901234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border)", fontSize: 15, outline: "none" }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" }}>Parol</label>
            <input
              type="password"
              placeholder="Kamida 6 belgi"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border)", fontSize: 15, outline: "none" }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: "var(--radius-md)", border: "none", backgroundColor: loading ? "var(--color-accent-hover)" : "var(--color-accent)", color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
          >
            {loading ? "Kutilmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Hisobingiz bormi? </span>
          <Link href="/login" style={{ fontSize: 14, color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}>Kirish</Link>
        </div>
      </div>
    </div>
  );
}
