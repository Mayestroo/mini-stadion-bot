import { api } from "./client";

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
