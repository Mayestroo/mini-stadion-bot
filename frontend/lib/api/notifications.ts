import { api } from "./client";

export const notificationApi = {
  getAll: (params?: { q?: string; type?: string; skip?: number; limit?: number }) => api.get("/notifications/", { params }).then((r) => r.data),
  getUnread: () => api.get("/notifications/unread-count").then((r) => r.data),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch("/notifications/read-all").then((r) => r.data),
};
