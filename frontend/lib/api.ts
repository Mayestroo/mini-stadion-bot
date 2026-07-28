import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
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

export const authApi = {
  register: (data: { full_name: string; phone: string; password: string }) =>
    api.post("/auth/register", data).then((r) => r.data),

  login: (data: { phone: string; password: string }) =>
    api.post("/auth/login", data).then((r) => r.data),

  ownerLogin: (data: { owner_login: string; password: string }) =>
    api.post("/auth/owner-login", data).then((r) => r.data),

  ownerChangePassword: (data: { current_password: string; new_password: string }) =>
    api.post("/auth/owner-change-password", data).then((r) => r.data),

  getMe: () =>
    api.get("/auth/me").then((r) => r.data),
};

export const stadiumApi = {
  getAll: (params?: Record<string, any>) =>
    api.get("/stadiums/", { params }).then((r) => r.data),

  getOne: (slug: string) =>
    api.get(`/stadiums/${slug}`).then((r) => r.data),

  getAvailability: (stadiumId: number, date: string) =>
    api.get(`/stadiums/${stadiumId}/availability`, { params: { date } }).then((r) => r.data),

  create: (data: any) =>
    api.post("/stadiums/", data).then((r) => r.data),

  update: (id: number, data: any) =>
    api.put(`/stadiums/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/stadiums/${id}`).then((r) => r.data),

  uploadImages: (stadiumId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    return api.post(`/uploads/stadium/${stadiumId}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
};

export const authTelegram = (data: { init_data: string; phone?: string }) =>
  api.post("/auth/telegram-auth", data).then((r) => r.data);

export const updateProfile = (data: { phone?: string; full_name?: string }) =>
  api.put("/auth/me", data).then((r) => r.data);

export const bookingApi = {
  create: (data: { stadium_id: number; date: string; start_time: string; end_time: string; note?: string }) =>
    api.post("/bookings/", data).then((r) => r.data),

  getMyBookings: () =>
    api.get("/bookings/my").then((r) => r.data),

  getOne: (code: string) =>
    api.get(`/bookings/${code}`).then((r) => r.data),

  cancel: (id: number) =>
    api.patch(`/bookings/${id}/cancel`).then((r) => r.data),

  getAllAdmin: (params?: Record<string, any>) =>
    api.get("/bookings/admin/all", { params }).then((r) => r.data),

  updateStatus: (id: number, status: string, adminNote?: string) =>
    api.patch(`/bookings/admin/${id}/status`, { status, admin_note: adminNote }).then((r) => r.data),
};

export const ownerApi = {
  me: () => api.get("/owner/me").then((r) => r.data),
  stats: () => api.get("/owner/stats").then((r) => r.data),
  getDrafts: () => api.get("/owner/stadium-drafts").then((r) => r.data),
  createDraft: (data: any) => api.post("/owner/stadium-drafts", data).then((r) => r.data),
  updateDraft: (id: number, data: any) => api.put(`/owner/stadium-drafts/${id}`, data).then((r) => r.data),
  submitDraft: (id: number) => api.post(`/owner/stadium-drafts/${id}/submit`).then((r) => r.data),
  createUpdateDraft: (stadiumId: number, data: any) => api.post(`/owner/stadiums/${stadiumId}/draft`, data).then((r) => r.data),
  createImageDraft: (stadiumId: number, data: { action: string; image_url: string }) => api.post(`/owner/stadiums/${stadiumId}/image-drafts`, data).then((r) => r.data),
  getBookings: (params?: Record<string, any>) => api.get("/owner/bookings", { params }).then((r) => r.data),
  confirmBooking: (id: number) => api.patch(`/owner/bookings/${id}/confirm`).then((r) => r.data),
  requestCancel: (id: number, reason: string) => api.post(`/owner/bookings/${id}/cancel-request`, { reason }).then((r) => r.data),
  getCustomers: () => api.get("/owner/customers").then((r) => r.data),
  getNotifications: (params?: { q?: string; type?: string; skip?: number; limit?: number }) => api.get("/owner/notifications", { params }).then((r) => r.data),
  getUnreadNotifications: () => api.get("/owner/notifications/unread-count").then((r) => r.data),
  markNotificationRead: (id: number) => api.patch(`/owner/notifications/${id}/read`).then((r) => r.data),
  markAllNotificationsRead: () => api.patch("/owner/notifications/read-all").then((r) => r.data),
};

export const notificationApi = {
  getAll: (params?: { q?: string; type?: string; skip?: number; limit?: number }) => api.get("/notifications/", { params }).then((r) => r.data),
  getUnread: () => api.get("/notifications/unread-count").then((r) => r.data),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch("/notifications/read-all").then((r) => r.data),
};

export const superadminApi = {
  getStatistics: () => api.get("/admin/statistics").then((r) => r.data),
  getOwners: () => api.get("/admin/owners").then((r) => r.data),
  createOwner: (data: any) => api.post("/admin/owners", data).then((r) => r.data),
  updateOwner: (id: number, data: any) => api.patch(`/admin/owners/${id}`, data).then((r) => r.data),
  getStadiumDrafts: () => api.get("/admin/moderation/stadium-drafts").then((r) => r.data),
  approveStadiumDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/stadium-drafts/${id}/approve`, { review_note }).then((r) => r.data),
  rejectStadiumDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/stadium-drafts/${id}/reject`, { review_note }).then((r) => r.data),
  getImageDrafts: () => api.get("/admin/moderation/image-drafts").then((r) => r.data),
  approveImageDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/image-drafts/${id}/approve`, { review_note }).then((r) => r.data),
  rejectImageDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/image-drafts/${id}/reject`, { review_note }).then((r) => r.data),
  getCancelRequests: () => api.get("/admin/moderation/cancel-requests").then((r) => r.data),
  approveCancelRequest: (id: number, review_note?: string) => api.post(`/admin/moderation/cancel-requests/${id}/approve`, { review_note }).then((r) => r.data),
  rejectCancelRequest: (id: number, review_note?: string) => api.post(`/admin/moderation/cancel-requests/${id}/reject`, { review_note }).then((r) => r.data),
  getBroadcasts: () => api.get("/admin/broadcasts").then((r) => r.data),
  createBroadcast: (data: { audience: "users" | "owners" | "all" | "booked_users" | "stadium_customers"; stadium_id?: number; title: string; message: string; image_url?: string; cta_text?: string; cta_url?: string; parse_mode?: "HTML" | "Markdown" | "" }) => api.post("/admin/broadcasts", data).then((r) => r.data),
  previewBroadcast: (data: { audience: "users" | "owners" | "all" | "booked_users" | "stadium_customers"; stadium_id?: number; title: string; message: string }) => api.post("/admin/broadcasts/preview", data).then((r) => r.data),
  retryBroadcastFailed: (id: number) => api.post(`/admin/broadcasts/${id}/retry-failed`).then((r) => r.data),
  getBroadcastRecipients: (id: number) => api.get(`/admin/broadcasts/${id}/recipients`).then((r) => r.data),
  getAuditLogs: (params?: Record<string, any>) => api.get("/admin/audit", { params }).then((r) => r.data),
};

export const uploadApi = {
  broadcastImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/broadcast/image", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
};

export function getImageUrl(path?: string): string {
  if (!path) return "/images/stadium-placeholder.svg";
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path}`;
}
