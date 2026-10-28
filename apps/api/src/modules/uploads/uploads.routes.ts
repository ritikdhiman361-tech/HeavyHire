import crypto from "node:crypto";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { LIMITS, UPLOAD_PURPOSES } from "@heavyhire/shared";
import { features } from "../../config/env";
import { requireUser } from "../../middleware/auth";
import {
  PRIVATE_DIR,
  PUBLIC_DIR,
  createUploadTicket,
  localUploadResult,
  verifyLocalDocumentLink,
} from "../../lib/storage";
import { ApiError } from "../../utils/ApiError";
import { parse } from "../../utils/validate";
import { ok } from "../../utils/respond";

export const uploadsRouter = Router();

const purposeSchema = z.object({ purpose: z.enum(UPLOAD_PURPOSES) });
const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf"]);

/** Step 1 of every upload: ask where/how to upload the file. */
uploadsRouter.post("/sign", requireUser, (req, res) => {
  const { purpose } = parse(purposeSchema, req.body);
  ok(res, createUploadTicket(purpose));
});

// ---- Development only: save files on this computer instead of Cloudinary ----
const upload = multer({
  limits: { fileSize: LIMITS.maxUploadBytes },
  storage: multer.diskStorage({
    destination: (req, _file, cb) => cb(null, req.query.purpose === "photo" ? PUBLIC_DIR : PRIVATE_DIR),
    filename: (_req, file, cb) =>
      cb(null, `${crypto.randomBytes(12).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(ApiError.badRequest("Only photos (JPG, PNG, WEBP) or PDF files are allowed"));
    if (req.query.purpose === "photo" && ext === ".pdf") return cb(ApiError.badRequest("Machine photos must be images"));
    cb(null, true);
  },
});

uploadsRouter.post(
  "/local",
  requireUser,
  (req, _res, next) => {
    if (features.cloudinary) throw ApiError.notFound("Route");
    parse(purposeSchema, req.query);
    next();
  },
  upload.single("file"),
  (req, res) => {
    if (!req.file) throw ApiError.badRequest("No file received");
    const { purpose } = parse(purposeSchema, req.query);
    ok(res, localUploadResult(purpose, req.file.filename), 201);
  },
);

/** Opens a private document using a signed, expiring link. */
uploadsRouter.get("/private/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const exp = Number(req.query.exp);
  const sig = String(req.query.sig ?? "");
  if (!/^[0-9a-f]+$/.test(sig) || !verifyLocalDocumentLink(filename, exp, sig)) {
    throw ApiError.forbidden("This link has expired");
  }
  res.sendFile(path.join(PRIVATE_DIR, filename));
});
