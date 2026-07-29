import { api } from "./client";

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

  logout: () =>
    api.post("/auth/logout").then((r) => r.data),
};

export const authTelegram = (data: { init_data: string; phone?: string }) =>
  api.post("/auth/telegram-auth", data).then((r) => r.data);

export const updateProfile = (data: { phone?: string; full_name?: string }) =>
  api.put("/auth/me", data).then((r) => r.data);
