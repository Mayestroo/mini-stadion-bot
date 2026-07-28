"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTelegram } from "./TelegramProvider";
import { Bell, CalendarCheck, CircleUserRound, LogOut, MapPinned, Menu } from "lucide-react";
import { notificationApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const tabs = [
  { href: "/miniapp", label: "Stadionlar", icon: MapPinned },
  { href: "/miniapp/bookings", label: "Bronlarim", icon: CalendarCheck },
  { href: "/miniapp/notifications", label: "Xabarlar", icon: Bell },
];

const moreItems = [
  { href: "/miniapp/profile", label: "Profil", icon: CircleUserRound },
];

export function MiniAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, ready, close } = useTelegram();
  const { isAuthenticated, logout } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const hideTabbar = pathname.startsWith("/miniapp/stadiums/");
  const moreActive = moreItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

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
    <div className="mini-app max-w-[480px] mx-auto min-h-screen relative shadow-2xl bg-white dark:bg-black" data-theme={theme}>
      <main className="mini-page">
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
                  <span style={{ position: "relative", display: "inline-flex" }}>
                    <Icon size={21} strokeWidth={active ? 2.6 : 2.1} />
                    {tab.href === "/miniapp/notifications" && unreadCount > 0 ? (
                      <span style={{ position: "absolute", top: -8, right: -10, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 10, background: "var(--mini-red)", color: "white", fontSize: 10, display: "grid", placeItems: "center" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
                    ) : null}
                  </span>
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
