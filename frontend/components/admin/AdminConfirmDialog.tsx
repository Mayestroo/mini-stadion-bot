"use client";

import { useEffect, useState } from "react";
import { AdminButton, AdminInput } from "./AdminShell";

type Props = {
  open: boolean;
  title: string;
  text?: string;
  /** red button for destructive actions, green for regular confirmations */
  danger?: boolean;
  /** when set, the confirm button stays disabled until the user types this exact text */
  requireText?: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AdminConfirmDialog({
  open,
  title,
  text,
  danger = true,
  requireText,
  confirmLabel = "Tasdiqlash",
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState("");

  // Reset the typed confirmation every time the dialog closes.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const canConfirm = !requireText || typed.trim() === requireText;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", padding: 20 }}
      onClick={onCancel}
    >
      <div
        className="mini-card"
        style={{ width: "100%", maxWidth: 360, padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{title}</h3>
        {text ? <p style={{ color: "var(--mini-muted)", fontSize: 14, lineHeight: 1.45 }}>{text}</p> : null}
        {requireText ? (
          <AdminInput
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`Tasdiqlash uchun "${requireText}" deb yozing`}
            style={{ marginTop: 12 }}
          />
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <AdminButton tone="dark" onClick={onCancel} disabled={busy}>Bekor qilish</AdminButton>
          <AdminButton tone={danger ? "red" : "green"} onClick={onConfirm} disabled={!canConfirm || busy}>
            {busy ? "Bajarilmoqda..." : confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
