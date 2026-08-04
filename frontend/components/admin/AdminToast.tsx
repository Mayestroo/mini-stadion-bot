"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Toast = { id: number; tone: "green" | "red"; text: string };

const ToastContext = createContext<{ push: (tone: "green" | "red", text: string) => void }>({ push: () => {} });

/** One-line feedback for admin actions: `toast.push("green", "Saqlanmoqda")`. */
export function useAdminToast() {
  return useContext(ToastContext);
}

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const push = useCallback((tone: "green" | "red", text: string) => {
    setToast({ id: Date.now(), tone, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {toast ? (
        <div className="admin-toast" role="status" aria-live="polite">
          <span
            className="admin-toast-inner"
            style={{
              background: toast.tone === "green" ? "rgba(52,199,89,0.95)" : "rgba(255,59,48,0.95)",
            }}
          >
            {toast.tone === "green" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            <span>{toast.text}</span>
          </span>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
