import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const vendorFields = z.object({
    businessName: z.string().trim().min(2, "Enter your name or business name").max(100),
    area: optionalText(200), // locality / address
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Invalid GST number")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    idDocType: z.enum(["PAN", "AADHAAR"]),
    idDocKey: z.string().min(1, "Upload your ID document").max(300),
    upiId: z
      .string()
      .trim()
      .regex(/^[\w.-]{2,}@[a-zA-Z]{2,}$/, "Invalid UPI ID")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    bankAccountName: optionalText(100),
    bankAccountNumber: z
      .string()
      .trim()
      .regex(/^\d{9,18}$/, "Invalid account number")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    bankIfsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code")
      .optional()
      .or(z.literal("").transform(() => undefined)),
});

export const PAYOUT_MISSING = "Add a UPI ID or full bank details so we can pay you";

/** Becoming a vendor: everything required. */
export const vendorSchema = vendorFields.refine(
  (v) => v.upiId || (v.bankAccountNumber && v.bankIfsc && v.bankAccountName),
  { message: PAYOUT_MISSING, path: ["upiId"] },
);

/**
 * Editing the profile: the ID document and bank account number may be left
 * empty to keep the ones already saved (the app never sees the full number).
 */
export const vendorUpdateSchema = vendorFields.extend({
  idDocKey: z.string().max(300).optional().or(z.literal("").transform(() => undefined)),
});

export type VendorInput = z.input<typeof vendorSchema>;
