import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import type { UploadPurpose } from "@heavyhire/shared";
import { env, features } from "../config/env";

// Files come in two kinds:
//   • photo    → public (machine photos). We store { url, publicId }.
//   • document → PRIVATE (ID proof, RC). We store only a "key"; admins get a
//                signed link to view it. A document is never publicly listed.
//
// Production uses Cloudinary. In development without Cloudinary keys,
// files are saved in apps/api/uploads/ instead.

if (features.cloudinary) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
export const PUBLIC_DIR = path.join(UPLOAD_DIR, "public");
export const PRIVATE_DIR = path.join(UPLOAD_DIR, "private");
if (!features.cloudinary) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
}

/**
 * Gives the app permission to upload ONE file straight to Cloudinary
 * (the file never passes through our server, which keeps it fast).
 */
export function createUploadTicket(purpose: UploadPurpose) {
  if (!features.cloudinary) {
    return { mode: "local" as const, uploadUrl: `${env.API_URL}/api/v1/uploads/local?purpose=${purpose}` };
  }
  const timestamp = Math.round(Date.now() / 1000);
  const params: Record<string, string | number> =
    purpose === "photo"
      ? { timestamp, folder: "heavyhire/machines" }
      : { timestamp, folder: "heavyhire/documents", type: "authenticated" };
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET!);
  return {
    mode: "cloudinary" as const,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    fields: { ...params, api_key: env.CLOUDINARY_API_KEY!, signature },
  };
}

/** Result of a local (dev) upload, same shape the app gets from Cloudinary. */
export function localUploadResult(purpose: UploadPurpose, filename: string) {
  return purpose === "photo"
    ? { url: `${env.API_URL}/uploads/public/${filename}`, publicId: `local:${filename}` }
    : { key: `local:${filename}` };
}

function signLocal(filename: string, exp: number) {
  return crypto.createHmac("sha256", env.FILE_URL_SECRET).update(`${filename}:${exp}`).digest("hex");
}

/** A link to view a private document, valid for 15 minutes. */
export function documentViewUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("local:")) {
    const filename = key.slice(6);
    const exp = Math.floor(Date.now() / 1000) + 15 * 60;
    return `${env.API_URL}/api/v1/uploads/private/${encodeURIComponent(filename)}?exp=${exp}&sig=${signLocal(filename, exp)}`;
  }
  if (!features.cloudinary) return null;
  return cloudinary.utils.private_download_url(key, "", {
    type: "authenticated",
    resource_type: "image",
    expires_at: Math.floor(Date.now() / 1000) + 15 * 60,
  });
}

/** Checks a local private link made by documentViewUrl(). */
export function verifyLocalDocumentLink(filename: string, exp: number, sig: string): boolean {
  if (!exp || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(signLocal(filename, exp), "hex");
  const given = Buffer.from(sig, "hex");
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** Documents uploaded to Cloudinary come back as a public_id; we store it as the key. */
export function isValidDocumentKey(key: string) {
  return /^local:[\w.-]+$/.test(key) || /^[\w/-]{3,200}$/.test(key);
}
