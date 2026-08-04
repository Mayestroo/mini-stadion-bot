"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuthStore();
  const isLoginPage = pathname === "/owner/login";

  useEffect(() => {
    if (!hydrated || isLoginPage) return;
    if (!isAuthenticated || user?.role !== "owner") {
      router.push("/owner/login");
      return;
    }
    if (user.must_change_password && pathname !== "/owner/change-password") {
      router.push("/owner/change-password");
    }
  }, [hydrated, isAuthenticated, isLoginPage, pathname, router, user]);

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
