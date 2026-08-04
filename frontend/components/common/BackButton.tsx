"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Shared top-left back button for all shells.
 * "solid" matches the mini-app card style; "light" is for the dark owner header.
 * Falls back to a sensible parent when there is no navigation history.
 */
export function BackButton({
  fallback = "/miniapp",
  variant = "solid",
  style,
}: {
  fallback?: string;
  variant?: "solid" | "light";
  style?: React.CSSProperties;
}) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Orqaga"
      className={`${variant === "solid" ? "mini-card-solid " : ""}mini-pressable`}
      style={{
        width: 40,
        height: 40,
        borderRadius: 15,
        border: variant === "light" ? "1px solid rgba(255,255,255,0.18)" : 0,
        background: variant === "light" ? "rgba(255,255,255,0.12)" : undefined,
        color: variant === "light" ? "white" : "var(--mini-text)",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        flexShrink: 0,
        ...style,
      }}
    >
      <ArrowLeft size={19} />
    </button>
  );
}
