import { z } from "zod";
import { LIMITS } from "../constants";
import { latSchema, lngSchema, photoSchema, rupeesToPaiseSchema } from "./common";

const currentYear = new Date().getFullYear();

/** Prices come in as RUPEES from the form and are stored as paise. */
export const machineSchema = z
  .object({
    categoryId: z.string().min(1, "Choose a machine type"),
    brand: z.string().trim().min(2).max(60),
    model: z.string().trim().min(1).max(60),
    year: z.coerce.number().int().min(1980).max(currentYear + 1),
    registrationNo: z
      .string()
      .trim()
      .toUpperCase()
      .max(20)
      .optional()
      .transform((v) => (v ? v.replace(/\s/g, "") : undefined)),
    capacity: z.string().trim().max(60).optional(),
    description: z.string().trim().max(1000).optional(),
    rcDocKey: z.string().min(1, "Upload the RC").max(300),
    area: z.string().trim().max(100).optional(),
    lat: latSchema,
    lng: lngSchema,
    serviceRadiusKm: z.coerce.number().int().min(1).max(200).default(30),
    pricePerHour: rupeesToPaiseSchema.optional(),
    pricePerDay: rupeesToPaiseSchema.optional(),
    minHours: z.coerce.number().int().min(1).max(12).default(4),
    transportCharge: rupeesToPaiseSchema.default(0),
    fuelIncluded: z.boolean().default(true),
    photos: z
      .array(photoSchema)
      .min(LIMITS.minPhotosPerMachine, "Add at least one photo")
      .max(LIMITS.maxPhotosPerMachine),
  })
  .refine((m) => (m.pricePerHour ?? 0) > 0 || (m.pricePerDay ?? 0) > 0, {
    message: "Set a price per hour or per day",
    path: ["pricePerHour"],
  });

export type MachineInput = z.input<typeof machineSchema>;

export const searchSchema = z.object({
  category: z.string().max(40).optional(), // category slug
  lat: latSchema.optional(),
  lng: lngSchema.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD (India time)
  unit: z.enum(["HOUR", "DAY"]).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(), // paise, for the chosen unit
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(["nearest", "price", "rating"]).default("nearest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const blockSchema = z
  .object({
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((b) => b.endAt > b.startAt, { message: "End must be after start", path: ["endAt"] });
