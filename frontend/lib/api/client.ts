import axios from "axios";

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const url: string = error.config?.url || "";
      if (!url.includes("/auth/me")) {
        const path = window.location.pathname;
        if (path.startsWith("/miniapp")) {
          window.location.href = "/miniapp";
        } else {
          window.location.href = "/login?redirect=" + encodeURIComponent(path);
        }
      }
    }
    return Promise.reject(error);
  },
);

export function getImageUrl(path?: string): string {
  if (!path) return "/images/stadium-placeholder.svg";
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}
