import axios from "axios";

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  withCredentials: true,
});

/**
 * Only allow same-origin relative paths after login (blocks open-redirects
 * like /login?redirect=https://evil.example).
 */
export function safeRedirect(target: string | null | undefined, fallback = "/"): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return fallback;
}

/** Route-aware login page for each area of the app. */
function loginPathFor(path: string): string {
  if (path.startsWith("/owner")) return "/owner/login";
  if (path.startsWith("/miniapp")) return "/miniapp";
  return "/login?redirect=" + encodeURIComponent(path);
}

const LOGIN_PAGES = ["/login", "/register", "/owner/login"];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const url: string = error.config?.url || "";
      const path = window.location.pathname;
      // /auth/me is used as a passive session check — don't redirect on it.
      // Never redirect away from a page that's already a login page.
      if (!url.includes("/auth/me") && !LOGIN_PAGES.some((p) => path.startsWith(p))) {
        window.location.href = loginPathFor(path);
      }
    }
    return Promise.reject(error);
  },
);

export function getImageUrl(path?: string): string {
  if (!path) return "/images/stadium-placeholder.svg";
  if (path.startsWith("https://")) return path;
  return `${BASE_URL}${path}`;
}
