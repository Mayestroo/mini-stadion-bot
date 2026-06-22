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
  initData: string;
}

const TelegramContext = createContext<TelegramContextType>({
  user: null,
  theme: "light",
  ready: false,
  close: () => {},
  showAlert: () => {},
  requestContact: async () => null,
  initData: "",
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tg, setTg] = useState<any>(null);
  const [initData, setInitData] = useState("");
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const readWebApp = () => {
      if (cancelled) return;

      const webapp = (window as any).Telegram?.WebApp;
      if (!webapp && attempts < 30) {
        attempts += 1;
        window.setTimeout(readWebApp, 100);
        return;
      }

      if (webapp) {
        webapp.ready();
        webapp.expand?.();
        setTg(webapp);
        setInitData(webapp.initData || "");
        setUser(webapp.initDataUnsafe?.user || null);
        setTheme(webapp.colorScheme || "light");
        document.documentElement.style.setProperty("--tg-safe-area-top", `${webapp.safeAreaInset?.top || 0}px`);
        document.documentElement.style.setProperty("--tg-safe-area-bottom", `${webapp.safeAreaInset?.bottom || 0}px`);
      }

      setReady(true);
    };

    readWebApp();

    return () => {
      cancelled = true;
    };
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
    user: user || urlUser,
    theme,
    ready,
    close: () => tg?.close(),
    showAlert: (msg: string) => tg?.showAlert(msg),
    requestContact,
    initData,
  };

  return (
    <TelegramContext.Provider value={value}>
      <div data-theme={value.theme}>
        {children}
      </div>
    </TelegramContext.Provider>
  );
}
