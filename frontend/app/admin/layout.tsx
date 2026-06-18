"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { authTelegram } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, hydrated, login } = useAuthStore();
  const reAuthing = useRef(false);
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    if (!hydrated || checkDone) return;
    if (isAuthenticated && (user?.role === "moderator" || user?.role === "superadmin")) {
      setCheckDone(true);
      return;
    }

    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    if (tgUser && !isAuthenticated) {
      reAuthing.current = true;
      authTelegram({
        telegram_id: String(tgUser.id),
        username: tgUser.username || "",
        full_name: `${tgUser.first_name} ${tgUser.last_name || ""}`.trim(),
      })
        .then((data) => {
          if (data.user.phone) {
            login(data.user, data.access_token);
          } else {
            router.push("/login?redirect=" + encodeURIComponent(pathname));
          }
        })
        .catch(() => {
          router.push("/login?redirect=" + encodeURIComponent(pathname));
        });
      return;
    }

    router.push("/login?redirect=" + encodeURIComponent(pathname));
  }, [hydrated, isAuthenticated, pathname, router, user, login, checkDone]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === "moderator" || user?.role === "superadmin")) {
      setCheckDone(true);
    }
  }, [isAuthenticated, user]);

  if (!checkDone) {
    return (
      <div className="mini-app" style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="mini-card" style={{ textAlign: "center", color: "var(--mini-muted)", padding: "34px 28px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, border: "3px solid var(--mini-green, #34c759)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p>Yuklanmoqda...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
