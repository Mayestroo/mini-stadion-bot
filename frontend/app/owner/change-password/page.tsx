"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { OwnerButton, OwnerCard, OwnerInput, OwnerShell } from "@/components/owner/OwnerShell";

export default function OwnerChangePasswordPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const user = await authApi.ownerChangePassword({ current_password: currentPassword, new_password: newPassword });
      setUser(user);
      router.push("/owner");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Parol almashtirilmadi");
    }
  }

  return (
    <OwnerShell>
      <OwnerCard>
        <h2 style={{ fontSize: 25, fontWeight: 950, letterSpacing: "-0.04em" }}>Parolni almashtiring</h2>
        <p style={{ color: "#627064", marginTop: 6, marginBottom: 16 }}>Vaqtinchalik parolni doimiy parolga almashtiring.</p>
        {error ? <div style={{ color: "#ff3b30", fontWeight: 750, marginBottom: 12 }}>{error}</div> : null}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <OwnerInput type="password" placeholder="Joriy parol" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          <OwnerInput type="password" placeholder="Yangi parol" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <OwnerButton type="submit">Saqlash</OwnerButton>
        </form>
      </OwnerCard>
    </OwnerShell>
  );
}
