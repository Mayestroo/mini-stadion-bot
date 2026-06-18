"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated || pathname === "/owner/login") return;
    if (!isAuthenticated || user?.role !== "owner") {
      router.push("/owner/login");
      return;
    }
    if (user.must_change_password && pathname !== "/owner/change-password") {
      router.push("/owner/change-password");
    }
  }, [hydrated, isAuthenticated, pathname, router, user]);

  return <>{children}</>;
}
