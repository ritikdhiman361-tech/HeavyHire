import type { Response } from "express";

// Every API response has the same shape, so the app can handle them all alike.

export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function okList(res: Response, data: unknown[], meta: { page: number; limit: number; total: number }) {
  return res.json({ success: true, data, meta });
}
