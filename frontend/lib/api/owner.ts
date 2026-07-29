import { api } from "./client";

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
