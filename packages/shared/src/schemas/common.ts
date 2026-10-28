import { z } from "zod";

/** Indian mobile: 10 digits starting 6–9. Accepts "98765 43210", "+91 98765-43210". */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"))
  .transform((v) => `+91${v}`);

export const idSchema = z.string().min(1).max(40);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const latSchema = z.coerce.number().min(-90).max(90);
export const lngSchema = z.coerce.number().min(-180).max(180);

/** Rupees typed in a form → paise integer. */
export const rupeesToPaiseSchema = z.coerce
  .number()
  .min(0)
  .max(10_000_000)
  .transform((r) => Math.round(r * 100));

export const photoSchema = z.object({
  url: z.string().min(1).max(500),
  publicId: z.string().min(1).max(300),
});
