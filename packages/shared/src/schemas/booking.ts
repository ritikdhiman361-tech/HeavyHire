import { z } from "zod";
import { LIMITS } from "../constants";
import { latSchema, lngSchema } from "./common";

export const priceQuerySchema = z.object({
  unit: z.enum(["HOUR", "DAY"]),
  quantity: z.coerce.number().int().min(1),
  paymentPlan: z.enum(["FULL", "ADVANCE"]).default("FULL"),
});

export const createBookingSchema = z
  .object({
    machineId: z.string().min(1),
    unit: z.enum(["HOUR", "DAY"]),
    quantity: z.coerce.number().int().min(1),
    startAt: z.coerce.date(),
    siteAddress: z.string().trim().min(5, "Enter the site address").max(300),
    siteLat: latSchema,
    siteLng: lngSchema,
    notes: z.string().trim().max(500).optional(),
    paymentPlan: z.enum(["FULL", "ADVANCE"]).default("FULL"),
  })
  .refine(
    (b) =>
      b.unit === "HOUR" ? b.quantity <= LIMITS.maxHoursPerBooking : b.quantity <= LIMITS.maxDaysPerBooking,
    { message: "Booking is too long", path: ["quantity"] },
  );

export type CreateBookingInput = z.input<typeof createBookingSchema>;

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const acceptBookingSchema = z.object({
  operatorName: z.string().trim().max(80).optional(),
  operatorPhone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Invalid phone")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const rejectBookingSchema = z.object({ reason: z.string().trim().min(2).max(300) });

export const vendorStatusSchema = z.object({
  status: z.enum(["ON_THE_WAY", "WORKING", "COMPLETED"]),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
