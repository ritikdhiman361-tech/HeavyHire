import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { PricingError } from "@heavyhire/shared";
import { ApiError } from "../utils/ApiError";
import { logger } from "../lib/logger";

/** Any URL we don't have. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, "ROUTE_NOT_FOUND", `${req.method} ${req.path} does not exist`));
};

/**
 * Last stop for every error. Express 5 sends errors from async handlers
 * here automatically, so routes can simply `throw`.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let error = err;

  if (err instanceof PricingError) error = ApiError.badRequest(err.message, "PRICING_ERROR");
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") error = ApiError.conflict("This already exists", "DUPLICATE");
    if (err.code === "P2025") error = ApiError.notFound();
  }
  if (err?.type === "entity.parse.failed") error = ApiError.badRequest("Invalid JSON body");
  if (err?.code === "LIMIT_FILE_SIZE") error = ApiError.badRequest("File is too large (max 8 MB)");

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
  }

  // Unexpected bug: log everything, but don't leak details to the user.
  logger.error({ err, path: req.path }, "Unhandled error");
  res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Something went wrong" } });
};
