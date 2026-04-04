import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";

export type UploadSessionPayload = {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  instructions?: string;
};

export async function createUploadSession(
  fileName: string,
  mimeType: string | undefined,
  folderPath: string | undefined
): Promise<UploadSessionPayload> {
  const { data } = await apiClient.post<ApiResponse<UploadSessionPayload>>("/api/v1/files/upload-session", {
    fileName,
    mimeType: mimeType?.trim() || undefined,
    folderPath: folderPath?.trim() || undefined,
  });
  const d = data.data;
  if (!d?.uploadUrl) {
    throw new Error("Server did not return an upload URL. Is Google Drive connected?");
  }
  return d;
}

/**
 * Uploads via backend → Google Drive. Direct browser PUT to googleapis.com is blocked by CORS.
 */
export async function uploadFileToGoogleDrive(file: File, folderPath?: string): Promise<string> {
  const fields: Record<string, string | Blob> = { file };
  if (folderPath?.trim()) {
    fields.folderPath = folderPath.trim();
  }
  const { data } = await apiClient.postForm<ApiResponse<{ id: string }>>(
    "/api/v1/files/upload",
    fields,
    {
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );
  const id = data.data?.id;
  if (!id) {
    throw new Error("Upload finished but server did not return a file id");
  }
  return id;
}

export async function downloadAuthenticatedBlob(path: string): Promise<Blob> {
  const { data } = await apiClient.get(path, { responseType: "blob" });
  return data;
}
