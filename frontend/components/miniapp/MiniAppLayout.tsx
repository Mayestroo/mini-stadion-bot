"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTelegram } from "./TelegramProvider";
import { Bell, CalendarCheck, CircleUserRound, Dumbbell, LogOut, MapPinned, Menu } from "lucide-react";
import { notificationApi, authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { BackButton } from "@/components/common/BackButton";

const tabs = [
  { href: "/miniapp", label: "Stadionlar", icon: MapPinned },
  { href: "/miniapp/bookings", label: "Bronlarim", icon: CalendarCheck },
  { href: "/miniapp/trainings", label: "Mashg'ulotlar", icon: Dumbbell },
];

const moreItems = [
  { href: "/miniapp/profile", label: "Profil", icon: CircleUserRound },
];

export function MiniAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, ready, close, user: tgUser } = useTelegram();
  const { isAuthenticated, hydrated, user: storedUser, logout, setUser } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const hideTabbar = pathname.startsWith("/miniapp/stadiums/");
  const moreActive = moreItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  // Back button only on inner list pages: tab roots navigate via the tabbar and
  // detail pages carry their own floating back button over the hero image.
  const segments = pathname.split("/").filter(Boolean);
  const showBackButton =
    segments[0] === "miniapp" &&
    segments.length === 2 &&
    segments[1] !== "bookings" &&
    segments[1] !== "notifications";
  // Notifications live in the top-right corner (with unread badge) instead of a
  // tab — hidden on the notifications page itself and on detail pages.
  const showBell = segments[0] === "miniapp" && segments.length <= 2 && pathname !== "/miniapp/notifications";

  useEffect(() => {
    if (!hydrated || !ready) return;
    if (!isAuthenticated || !storedUser || !tgUser) return;
    if (String(tgUser.id) !== storedUser.telegram_id) {
      logout();
    }
  }, [hydrated, ready, isAuthenticated, storedUser, tgUser, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;
    authApi.getMe().then((freshUser) => {
      if (freshUser) setUser(freshUser);
    }).catch(() => {});
  }, [isAuthenticated, setUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadUnread = () => notificationApi.getUnread().then((data) => setUnreadCount(data.unread_count || 0)).catch(() => setUnreadCount(0));
    loadUnread();
    const interval = window.setInterval(loadUnread, 15000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="mini-loader" style={{ height: "100dvh" }}>
        <div className="mini-loader-spinner" />
        <div>Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="mini-app max-w-120 mx-auto min-h-screen relative shadow-2xl bg-white dark:bg-black" data-theme={theme}>
      <main className="mini-page">
        {showBackButton || showBell ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            {showBackButton ? <BackButton /> : null}
            <button
              type="button"
              onClick={() => router.push("/miniapp")}
              aria-label="Bosh sahifa"
              className="mini-pressable"
              style={{ border: 0, background: "none", display: "flex", alignItems: "center", cursor: "pointer", padding: 0, color: "var(--mini-text)" }}
            >
              {/* Inline SVG: wordmark fill var(--mini-text) orqali dark rejimda
                  avtomatik oq bo'ladi (img-render buni qila olmaydi). */}
              <svg viewBox="0 0 680 260" role="img" aria-label="Sportly" width="109" height="42" style={{ display: "block" }} xmlns="http://www.w3.org/2000/svg">
                <rect x="40" y="50" width="160" height="160" rx="36" fill="#D85A30" />
                <path d="M148 92 C118 82, 88 92, 88 112 C88 130, 108 134, 128 138 C148 142, 152 150, 148 158 C142 168, 116 170, 92 158" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
                <circle cx="152" cy="160" r="9" fill="#FCDE5A" />
                <text x="232" y="150" fontSize="72" fontWeight="600" fill="var(--mini-text)">Sportly</text>
                <path d="M232 178 C280 178, 330 178, 380 178" stroke="#D85A30" strokeWidth="4" strokeLinecap="round" fill="none" />
              </svg>
            </button>
            {showBell ? (
              <button
                type="button"
                onClick={() => router.push("/miniapp/notifications")}
                aria-label="Xabarlar"
                className="mini-card-solid mini-pressable"
                style={{ width: 40, height: 40, borderRadius: 15, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, marginLeft: "auto", position: "relative", color: "var(--mini-text)" }}
              >
                <Bell size={19} />
                {unreadCount > 0 ? (
                  <span style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 10, background: "var(--mini-red)", color: "white", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>

      {!hideTabbar && (
        <>
          {moreOpen ? (
            <>
              <button className="mini-more-backdrop" type="button" aria-label="Menyuni yopish" onClick={() => setMoreOpen(false)} />
              <div className="mini-more-menu" role="menu" aria-label="Qo'shimcha menyu">
                {moreItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      className={`mini-more-item mini-pressable${active ? " mini-more-item-active" : ""}`}
                      onClick={() => router.push(item.href)}
                      role="menuitem"
                    >
                      <span>{item.label}</span>
                      <Icon size={18} strokeWidth={active ? 2.5 : 2.1} />
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="mini-more-item mini-more-item-danger mini-pressable"
                  onClick={() => { logout(); close(); }}
                  role="menuitem"
                >
                  <span>Chiqish</span>
                  <LogOut size={18} strokeWidth={2.1} />
                </button>
              </div>
            </>
          ) : null}

          <nav className="mini-tabbar mini-tabbar-user">
            {tabs.map((tab) => {
              const active = pathname === tab.href || (tab.href !== "/miniapp" && pathname.startsWith(tab.href));
              const Icon = tab.icon;
              return (
                <button
                  key={tab.href}
                  type="button"
                  onClick={() => router.push(tab.href)}
                  className={`mini-tab mini-pressable${active ? " mini-tab-active" : ""}`}
                >
                  <Icon size={21} strokeWidth={active ? 2.6 : 2.1} />
                  {tab.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={`mini-tab mini-more-tab mini-pressable${moreOpen || moreActive ? " mini-tab-active" : ""}`}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              <Menu size={24} strokeWidth={moreOpen || moreActive ? 2.8 : 2.3} />
              More
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
