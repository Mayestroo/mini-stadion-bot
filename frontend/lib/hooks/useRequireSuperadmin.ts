"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

/**
 * Client-side gate for superadmin-only pages. The backend still enforces
 * authorization on every endpoint — this hook just keeps moderators out of
 * UI they can never use, redirecting them back to the admin dashboard.
 */
export function useRequireSuperadmin() {
  const router = useRouter();
  const { user, isAuthenticated, hydrated } = useAuthStore();
  const isSuperadmin = user?.role === "superadmin";

  useEffect(() => {
    if (hydrated && isAuthenticated && user && !isSuperadmin) {
      router.replace("/admin");
    }
  }, [hydrated, isAuthenticated, user, isSuperadmin, router]);

  return isSuperadmin;
}
