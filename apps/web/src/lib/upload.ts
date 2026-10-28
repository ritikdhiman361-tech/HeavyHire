import type { UploadPurpose } from "@heavyhire/shared";
import { LIMITS } from "@heavyhire/shared";
import { api, ApiError, getTokens } from "./api";

// Uploads a file in 2 steps:
//   1. ask our API for an upload "ticket"
//   2. send the file straight to Cloudinary (or to the API in dev mode)

type Ticket =
  | { mode: "cloudinary"; uploadUrl: string; fields: Record<string, string | number> }
  | { mode: "local"; uploadUrl: string };

export type PhotoResult = { url: string; publicId: string };
export type DocumentResult = { key: string };

export async function uploadFile(file: File, purpose: "photo"): Promise<PhotoResult>;
export async function uploadFile(file: File, purpose: "document"): Promise<DocumentResult>;
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<PhotoResult | DocumentResult> {
  if (file.size > LIMITS.maxUploadBytes) throw new ApiError(400, "FILE_TOO_BIG", "File is too large (max 8 MB)");

  const ticket = await api.post<Ticket>("/uploads/sign", { purpose });
  const form = new FormData();
  form.append("file", file);

  if (ticket.mode === "cloudinary") {
    for (const [k, v] of Object.entries(ticket.fields)) form.append(k, String(v));
    const res = await fetch(ticket.uploadUrl, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new ApiError(res.status, "UPLOAD_FAILED", json?.error?.message ?? "Upload failed");
    return purpose === "photo" ? { url: json.secure_url, publicId: json.public_id } : { key: json.public_id };
  }

  const res = await fetch(ticket.uploadUrl, {
    method: "POST",
    body: form,
    headers: { authorization: `Bearer ${getTokens()?.accessToken ?? ""}` },
  });
  const json = await res.json();
  if (!json.success) throw new ApiError(res.status, json.error?.code ?? "UPLOAD_FAILED", json.error?.message ?? "Upload failed");
  return json.data;
}
