import { apiFetch, apiGet } from "./client";
import { API_BASE_URL } from "@/lib/constants";
import { getAccessToken } from "./client";

export interface MediaUploadResponse {
  id: string;
  secureUrl: string;
  mimeType: string;
  sizeBytes: number;
  originalName?: string;
}

export const mediaApi = {
  get: (id: string) =>
    apiGet<MediaUploadResponse>(`/api/media/${encodeURIComponent(id)}`),
  upload: async (file: File): Promise<MediaUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const extension = file.name.split(".").pop()?.toLowerCase();
    formData.append(
      "category",
      file.type.startsWith("image/")
        ? "image"
        : ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(
              extension ?? "",
            )
          ? "document"
          : "code",
    );

    const token = getAccessToken();
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(err.message ?? "Upload failed");
    }
    return { ...(await res.json()), originalName: file.name };
  },

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/media/${id}`, {
      method: "DELETE",
      auth: true,
    }),
};
