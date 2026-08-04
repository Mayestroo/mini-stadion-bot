"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authTelegram } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, hydrated, login } = useAuthStore();
  const isLoginPage = pathname === "/owner/login";
  const reAuthing = useRef(false);

  useEffect(() => {
    // The login page runs its own Telegram auto-auth attempt.
    if (!hydrated || isLoginPage) return;

    if (isAuthenticated) {
      if (user?.role !== "owner") {
        router.push("/owner/login");
        return;
      }
      if (user.must_change_password && pathname !== "/owner/change-password") {
        router.push("/owner/change-password");
      }
      return;
    }

    // Owner access is Telegram-ID based: a role change invalidates the old
    // session (token_version bump), so inside the mini-app we silently
    // re-authenticate with the signed initData instead of showing a
    // password form the Telegram-based owner doesn't have.
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    const initData = tg?.initData || "";
    if (tgUser && initData && !reAuthing.current) {
      reAuthing.current = true;
      authTelegram({ init_data: initData })
        .then((data) => login(data.user))
        .catch(() => router.push("/owner/login"));
      return;
    }
    router.push("/owner/login");
  }, [hydrated, isAuthenticated, isLoginPage, pathname, router, user, login]);

  // Block rendering until auth state is known — prevents flashing protected
  // content (and firing owner API calls) before the redirect runs.
  if (isLoginPage) return <>{children}</>;
  if (!hydrated || !isAuthenticated || user?.role !== "owner") {
    return (
      <div className="mini-loader" style={{ minHeight: "100vh" }}>
        <div className="mini-loader-spinner" />
        <div>Yuklanmoqda...</div>
      </div>
    );
  }

  return <>{children}</>;
}
