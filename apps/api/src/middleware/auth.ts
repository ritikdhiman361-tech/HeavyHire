import type { Request, RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../modules/auth/auth.service";
import { ApiError } from "../utils/ApiError";

/** Reads the "Authorization: Bearer <token>" header and loads the user. */
async function loadUser(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized();

  const payload = verifyAccessToken(header.slice(7));
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw ApiError.unauthorized();
  if (user.isBlocked) throw ApiError.forbidden("Your account is blocked. Please contact support.");

  req.user = user;
  return user;
}

/** Route needs a logged-in user. Adds `req.user`. */
export const requireUser: RequestHandler = async (req, _res, next) => {
  await loadUser(req);
  next();
};

/**
 * Route needs a vendor profile. Adds `req.user` and `req.vendor`.
 * `approved: true` also requires admin approval (e.g. to accept bookings).
 */
export function requireVendor({ approved = false } = {}): RequestHandler {
  return async (req, _res, next) => {
    const user = await loadUser(req);
    const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    if (!vendor) throw ApiError.forbidden("Create your vendor profile first");
    if (approved && vendor.status !== "APPROVED") {
      throw ApiError.forbidden("Your vendor account is waiting for approval");
    }
    req.vendor = vendor;
    next();
  };
}

/** Route is for HeavyHire admins only. */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const user = await loadUser(req);
  if (user.role !== "ADMIN") throw ApiError.forbidden();
  next();
};
