import type { z } from "zod";
import { ApiError } from "./ApiError";

/**
 * Checks request data against a Zod schema and returns the clean, typed result.
 * Usage inside a route:  const body = parse(createBookingSchema, req.body);
 */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ApiError(400, "VALIDATION_ERROR", first?.message ?? "Invalid request", {
      fields: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return result.data;
}
