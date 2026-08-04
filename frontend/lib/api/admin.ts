import type { User } from "@/lib/types";
import { api } from "./client";

export interface Page<T> {
  items: T[];
  total: number;
}

export interface SettingItem {
  key: string;
  value: string;
  description?: string;
  kind: "bool" | "int" | "str";
  updated_by?: number;
  updated_at?: string;
}

export const superadminApi = {
  getStatistics: () => api.get("/admin/statistics").then((r) => r.data),
  getUsers: (params?: Record<string, any>): Promise<Page<User>> => api.get("/admin/users", { params }).then((r) => r.data),
  toggleUserBlock: (id: number): Promise<User> => api.post(`/admin/users/${id}/block`).then((r) => r.data),
  setUserRole: (id: number, role: "user" | "moderator" | "owner"): Promise<User> => api.post(`/admin/users/${id}/role`, { role }).then((r) => r.data),
  getSettings: (): Promise<SettingItem[]> => api.get("/admin/settings").then((r) => r.data),
  updateSetting: (key: string, value: string): Promise<SettingItem> => api.patch(`/admin/settings/${key}`, { value }).then((r) => r.data),
  getOwners: (params?: Record<string, any>): Promise<User[]> => api.get("/admin/owners", { params }).then((r) => r.data),
  createOwner: (data: any) => api.post("/admin/owners", data).then((r) => r.data),
  updateOwner: (id: number, data: any) => api.patch(`/admin/owners/${id}`, data).then((r) => r.data),
  getStadiumDrafts: (params?: { status?: string }) => api.get("/admin/moderation/stadium-drafts", { params }).then((r) => r.data),
  approveStadiumDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/stadium-drafts/${id}/approve`, { review_note }).then((r) => r.data),
  rejectStadiumDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/stadium-drafts/${id}/reject`, { review_note }).then((r) => r.data),
  getImageDrafts: (params?: { status?: string }) => api.get("/admin/moderation/image-drafts", { params }).then((r) => r.data),
  approveImageDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/image-drafts/${id}/approve`, { review_note }).then((r) => r.data),
  rejectImageDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/image-drafts/${id}/reject`, { review_note }).then((r) => r.data),
  getTrainingDrafts: (params?: { status?: string }) => api.get("/admin/moderation/training-drafts", { params }).then((r) => r.data),
  approveTrainingDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/training-drafts/${id}/approve`, { review_note }).then((r) => r.data),
  rejectTrainingDraft: (id: number, review_note?: string) => api.post(`/admin/moderation/training-drafts/${id}/reject`, { review_note }).then((r) => r.data),
  getTrainings: () => api.get("/admin/trainings").then((r) => r.data),
  updateTraining: (id: number, data: { is_active?: boolean; is_featured?: boolean }) => api.patch(`/admin/trainings/${id}`, data).then((r) => r.data),
  getCancelRequests: (params?: { status?: string }) => api.get("/admin/moderation/cancel-requests", { params }).then((r) => r.data),
  approveCancelRequest: (id: number, review_note?: string) => api.post(`/admin/moderation/cancel-requests/${id}/approve`, { review_note }).then((r) => r.data),
  rejectCancelRequest: (id: number, review_note?: string) => api.post(`/admin/moderation/cancel-requests/${id}/reject`, { review_note }).then((r) => r.data),
  getBroadcasts: () => api.get("/admin/broadcasts").then((r) => r.data),
  createBroadcast: (data: { audience: "users" | "owners" | "all" | "booked_users" | "stadium_customers"; stadium_id?: number; title: string; message: string; image_url?: string; cta_text?: string; cta_url?: string; parse_mode?: "HTML" | "Markdown" | "" }) => api.post("/admin/broadcasts", data).then((r) => r.data),
  previewBroadcast: (data: { audience: "users" | "owners" | "all" | "booked_users" | "stadium_customers"; stadium_id?: number; title: string; message: string }) => api.post("/admin/broadcasts/preview", data).then((r) => r.data),
  retryBroadcastFailed: (id: number) => api.post(`/admin/broadcasts/${id}/retry-failed`).then((r) => r.data),
  getBroadcastRecipients: (id: number) => api.get(`/admin/broadcasts/${id}/recipients`).then((r) => r.data),
  getAuditLogs: (params?: Record<string, any>) => api.get("/admin/audit", { params }).then((r) => r.data),
};
