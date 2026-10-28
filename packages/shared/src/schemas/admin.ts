import { z } from "zod";

export const rejectSchema = z.object({ reason: z.string().trim().min(2).max(300) });

export const refundSchema = z.object({
  amount: z.coerce.number().int().min(100), // paise
  reason: z.string().trim().min(2).max(300),
});

export const markPaidSchema = z.object({ reference: z.string().trim().min(2).max(100) });

export const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "Use lowercase letters, numbers and dashes"),
  nameEn: z.string().trim().min(2).max(60),
  nameHi: z.string().trim().min(1).max(60),
  iconUrl: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const settingsSchema = z
  .object({
    commissionPercent: z.coerce.number().min(0).max(50),
    gstPercent: z.coerce.number().min(0).max(28),
    advancePercent: z.coerce.number().min(5).max(100),
    vendorReplyMinutes: z.coerce.number().int().min(10).max(1440),
    freeCancelHoursBefore: z.coerce.number().int().min(0).max(168),
    lateCancelRefundPercent: z.coerce.number().min(0).max(100),
  })
  .partial();
