import { api } from "./client";

export const stadiumApi = {
  getAll: (params?: Record<string, any>) =>
    api.get("/stadiums/", { params }).then((r) => r.data),

  getDistricts: (): Promise<string[]> =>
    api.get("/stadiums/districts").then((r) => r.data),

  getOne: (slug: string) =>
    api.get(`/stadiums/${slug}`).then((r) => r.data),

  getAvailability: (stadiumId: number, date: string) =>
    api.get(`/stadiums/${stadiumId}/availability`, { params: { date } }).then((r) => r.data),

  getQuote: (stadiumId: number, params: { date: string; start_time: string; end_time: string }) =>
    api.get(`/stadiums/${stadiumId}/quote`, { params }).then((r) => r.data),

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
