import { api } from "./client";

export const trainingApi = {
  getAll: (params?: Record<string, any>) =>
    api.get("/trainings/", { params }).then((r) => r.data),

  getOne: (slug: string) =>
    api.get(`/trainings/${slug}`).then((r) => r.data),

  contactClick: (slug: string) =>
    api.post(`/trainings/${slug}/contact-click`).then((r) => r.data),
};
