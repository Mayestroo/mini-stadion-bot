"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramContact {
  first_name?: string;
  last_name?: string;
  phone_number: string;
  user_id: number;
}

interface TelegramContextType {
  user: TelegramUser | null;
  theme: "light" | "dark";
  ready: boolean;
  close: () => void;
  showAlert: (msg: string) => void;
  requestContact: () => Promise<TelegramContact | null>;
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  theme: "light",
  ready: false,
  close: () => {},
  showAlert: () => {},
  requestContact: async () => null,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tg, setTg] = useState<any>(null);

  useEffect(() => {
    const webapp = (window as any).Telegram?.WebApp;
    if (webapp) {
      webapp.ready();
      setTg(webapp);
      setReady(true);
    } else {
      setReady(true);
    }
    document.documentElement.style.setProperty("--tg-safe-area-top", webapp?.safeAreaInset?.top + "px" || "0px");
    document.documentElement.style.setProperty("--tg-safe-area-bottom", webapp?.safeAreaInset?.bottom + "px" || "0px");
  }, []);

  const requestContact = useCallback(async () => {
    if (!tg?.requestContact) return null;
    try {
      return await new Promise<TelegramContact | null>((resolve) => {
        tg.requestContact((ok: boolean, response?: { responseUnsafe?: { contact?: TelegramContact } }) => {
          resolve(ok ? response?.responseUnsafe?.contact ?? null : null);
        });
      });
    } catch {
      return null;
    }
  }, [tg]);

  const tgUser = tg?.initDataUnsafe?.user || null;
  const urlUser = (() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    const id = p.get("tg_id");
    if (!id) return null;
    return {
      id: Number(id),
      first_name: p.get("full_name")?.split(" ")[0] || "User",
      last_name: p.get("full_name")?.split(" ").slice(1).join(" ") || undefined,
      username: p.get("username") || undefined,
    };
  })();

  const value: TelegramContextType = {
    user: tgUser || urlUser,
    theme: tg?.colorScheme || "light",
    ready,
    close: () => tg?.close(),
    showAlert: (msg: string) => tg?.showAlert(msg),
    requestContact,
  };

  return (
    <TelegramContext.Provider value={value}>
      <div data-theme={value.theme}>
        {children}
      </div>
    </TelegramContext.Provider>
  );
}
