import { z } from "zod";
import { phoneSchema } from "./common";

export const sendOtpSchema = z.object({ phone: phoneSchema });

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.email().max(120).optional().or(z.literal("").transform(() => undefined)),
  language: z.enum(["EN", "HI"]).optional(),
});
