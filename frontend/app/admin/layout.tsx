"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { authTelegram } from "@/lib/api";
import { AdminErrorBoundary } from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, hydrated, login } = useAuthStore();
  const reAuthing = useRef(false);
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    if (!hydrated || checkDone) return;

    if (isAuthenticated) {
      if (user?.role === "moderator" || user?.role === "superadmin") {
        setCheckDone(true);
        return;
      }
      router.push("/login?redirect=" + encodeURIComponent(pathname));
      return;
    }

    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    const initData = tg?.initData || "";
    if (tgUser && initData) {
      reAuthing.current = true;
      authTelegram({ init_data: initData })
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
    if (isAuthenticated && user?.role !== "moderator" && user?.role !== "superadmin") {
      router.push("/login?redirect=" + encodeURIComponent(pathname));
    }
  }, [isAuthenticated, user, router, pathname]);

  if (!checkDone) {
    return (
      <div className="mini-app" style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="mini-loader">
          <div className="mini-loader-spinner" />
          <div>Yuklanmoqda...</div>
        </div>
      </div>
    );
  }

  return <AdminErrorBoundary>{children}</AdminErrorBoundary>;
}
