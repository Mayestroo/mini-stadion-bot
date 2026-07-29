import { api } from "./client";

export const uploadApi = {
  broadcastImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/uploads/broadcast/image", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
};
