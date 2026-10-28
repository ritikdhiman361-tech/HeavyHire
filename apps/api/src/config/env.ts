import { z } from "zod";

// Reads settings from environment variables (the .env file in development)
// and stops the server right away if something important is missing,
// instead of crashing later in the middle of a booking.

const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    WEB_URL: z.string().default("http://localhost:3000"),
    API_URL: z.string().default("http://localhost:4000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    FILE_URL_SECRET: z.string().min(32, "FILE_URL_SECRET must be at least 32 characters"),
    ADMIN_PHONE: optional,

    MSG91_AUTH_KEY: optional,
    MSG91_OTP_TEMPLATE_ID: optional,
    MSG91_WHATSAPP_NUMBER: optional,

    RAZORPAY_KEY_ID: optional,
    RAZORPAY_KEY_SECRET: optional,
    RAZORPAY_WEBHOOK_SECRET: optional,

    CLOUDINARY_CLOUD_NAME: optional,
    CLOUDINARY_API_KEY: optional,
    CLOUDINARY_API_SECRET: optional,
  })
  .superRefine((env, ctx) => {
    // In production the fake "dev mode" services are NOT allowed.
    if (env.NODE_ENV !== "production") return;
    const required = [
      "MSG91_AUTH_KEY",
      "MSG91_OTP_TEMPLATE_ID",
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ] as const;
    for (const key of required) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required in production` });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

/** Which outside services are switched on. When off, a dev-mode fallback is used. */
export const features = {
  sms: Boolean(env.MSG91_AUTH_KEY && env.MSG91_OTP_TEMPLATE_ID),
  whatsapp: Boolean(env.MSG91_AUTH_KEY && env.MSG91_WHATSAPP_NUMBER),
  razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  cloudinary: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
};
