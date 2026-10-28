import { Router } from "express";
import { z } from "zod";
import {
  BOOKING_STATUSES,
  categorySchema,
  markPaidSchema,
  refundSchema,
  rejectSchema,
  settingsSchema,
} from "@heavyhire/shared";
import { prisma } from "../../lib/prisma";
import { getSettings } from "../../lib/settings";
import { requireAdmin } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { getPagination } from "../../utils/pagination";
import { ok, okList } from "../../utils/respond";
import { parse } from "../../utils/validate";
import { cancelByAdmin } from "../bookings/bookings.service";
import { adminView, bookingInclude } from "../bookings/bookings.view";
import { netPaid, refundBooking } from "../payments/payments.service";
import * as admin from "./admin.service";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

// ---- Stats -------------------------------------------------------------------

const rangeSchema = z.object({
  from: z.coerce.date().default(() => new Date(Date.now() - 30 * 24 * 3_600_000)),
  to: z.coerce.date().default(() => new Date()),
});

adminRouter.get("/stats", async (req, res) => {
  const { from, to } = parse(rangeSchema, req.query);
  ok(res, await admin.getStats(from, to));
});

// ---- Vendors -----------------------------------------------------------------

const approvalFilter = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  q: z.string().trim().max(60).optional(),
});

adminRouter.get("/vendors", async (req, res) => {
  const { status, q } = parse(approvalFilter, req.query);
  const { page, limit, skip, take } = getPagination(req.query);
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? { OR: [{ businessName: { contains: q, mode: "insensitive" as const } }, { user: { phone: { contains: q } } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      skip,
      take,
      select: {
        id: true,
        businessName: true,
        status: true,
        idDocType: true,
        createdAt: true,
        user: { select: { phone: true } },
        _count: { select: { machines: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);
  okList(res, items, { page, limit, total });
});

adminRouter.get("/vendors/:id", async (req, res) => {
  ok(res, await admin.getVendorForReview(req.params.id));
});

adminRouter.post("/vendors/:id/approve", async (req, res) => {
  ok(res, await admin.reviewVendor(req.params.id, true));
});

adminRouter.post("/vendors/:id/reject", async (req, res) => {
  const { reason } = parse(rejectSchema, req.body);
  ok(res, await admin.reviewVendor(req.params.id, false, reason));
});

// ---- Machines ----------------------------------------------------------------

const machineFilter = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAUSED"]).optional() });

adminRouter.get("/machines", async (req, res) => {
  const { status } = parse(machineFilter, req.query);
  const { page, limit, skip, take } = getPagination(req.query);
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.machine.findMany({
      where,
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      skip,
      take,
      select: {
        id: true,
        brand: true,
        model: true,
        year: true,
        status: true,
        area: true,
        createdAt: true,
        category: { select: { nameEn: true } },
        photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        vendor: { select: { id: true, businessName: true, status: true } },
      },
    }),
    prisma.machine.count({ where }),
  ]);
  okList(res, items, { page, limit, total });
});

adminRouter.get("/machines/:id", async (req, res) => {
  ok(res, await admin.getMachineForReview(req.params.id));
});

adminRouter.post("/machines/:id/approve", async (req, res) => {
  ok(res, await admin.reviewMachine(req.params.id, true));
});

adminRouter.post("/machines/:id/reject", async (req, res) => {
  const { reason } = parse(rejectSchema, req.body);
  ok(res, await admin.reviewMachine(req.params.id, false, reason));
});

// ---- Bookings ----------------------------------------------------------------

const bookingFilter = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
});

adminRouter.get("/bookings", async (req, res) => {
  const { q, status } = parse(bookingFilter, req.query);
  const { page, limit, skip, take } = getPagination(req.query);
  const where = admin.adminBookingWhere(q, status);
  const [items, total] = await Promise.all([
    prisma.booking.findMany({ where, include: bookingInclude, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.booking.count({ where }),
  ]);
  okList(res, items.map(adminView), { page, limit, total });
});

adminRouter.get("/bookings/:id", async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: bookingInclude });
  if (!booking) throw ApiError.notFound("Booking");
  ok(res, adminView(booking));
});

const adminCancelSchema = z.object({
  reason: z.string().trim().min(2).max(300),
  refundAmount: z.coerce.number().int().min(0).optional(), // paise; default = everything paid
});

adminRouter.post("/bookings/:id/cancel", async (req, res) => {
  const { reason, refundAmount } = parse(adminCancelSchema, req.body);
  ok(res, await cancelByAdmin(req.user!.id, req.params.id, reason, refundAmount));
});

/** Refund without cancelling (e.g. the machine came 3 hours late). */
adminRouter.post("/bookings/:id/refund", async (req, res) => {
  const { amount, reason } = parse(refundSchema, req.body);
  const paid = await netPaid(req.params.id);
  if (amount > paid) throw ApiError.badRequest(`Only ${paid / 100} rupees can be refunded`);
  const refunded = await refundBooking(req.params.id, amount, reason);
  await prisma.bookingEvent.create({
    data: {
      bookingId: req.params.id,
      status: (await prisma.booking.findUniqueOrThrow({ where: { id: req.params.id } })).status,
      actorId: req.user!.id,
      note: `Refund ₹${refunded / 100}: ${reason}`,
    },
  });
  ok(res, { refundAmount: refunded });
});

// ---- Payouts -----------------------------------------------------------------

const payoutFilter = z.object({ status: z.enum(["PENDING", "PAID", "FAILED"]).optional() });

adminRouter.get("/payouts", async (req, res) => {
  const { status } = parse(payoutFilter, req.query);
  const { page, limit, skip, take } = getPagination(req.query);
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take,
      include: {
        vendor: {
          select: { businessName: true, upiId: true, bankAccountName: true, bankAccountNumber: true, bankIfsc: true },
        },
        booking: { select: { bookingNumber: true } },
      },
    }),
    prisma.payout.count({ where }),
  ]);
  okList(res, items, { page, limit, total });
});

/** MVP: admin sends money by UPI/bank, then records the reference here. */
adminRouter.post("/payouts/:id/mark-paid", async (req, res) => {
  const { reference } = parse(markPaidSchema, req.body);
  const { count } = await prisma.payout.updateMany({
    where: { id: req.params.id, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PAID", reference, paidAt: new Date() },
  });
  if (!count) throw ApiError.badRequest("Payout not found or already paid");
  ok(res, { paid: true });
});

// ---- Users -------------------------------------------------------------------

const userFilter = z.object({ q: z.string().trim().max(60).optional() });

adminRouter.get("/users", async (req, res) => {
  const { q } = parse(userFilter, req.query);
  const { page, limit, skip, take } = getPagination(req.query);
  const where = q
    ? { OR: [{ phone: { contains: q.replace(/\D/g, "") || q } }, { name: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        vendor: { select: { id: true, status: true } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  okList(res, items, { page, limit, total });
});

async function setBlocked(adminId: string, userId: string, isBlocked: boolean) {
  if (adminId === userId) throw ApiError.badRequest("You can't block yourself");
  await prisma.user.update({ where: { id: userId }, data: { isBlocked } });
  // Blocking also logs them out everywhere.
  if (isBlocked) await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

adminRouter.post("/users/:id/block", async (req, res) => {
  await setBlocked(req.user!.id, req.params.id, true);
  ok(res, { blocked: true });
});

adminRouter.post("/users/:id/unblock", async (req, res) => {
  await setBlocked(req.user!.id, req.params.id, false);
  ok(res, { blocked: false });
});

// ---- Categories --------------------------------------------------------------

adminRouter.get("/categories", async (_req, res) => {
  ok(
    res,
    await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { machines: true } } } }),
  );
});

adminRouter.post("/categories", async (req, res) => {
  ok(res, await prisma.category.create({ data: parse(categorySchema, req.body) }), 201);
});

adminRouter.patch("/categories/:id", async (req, res) => {
  ok(res, await prisma.category.update({ where: { id: req.params.id }, data: parse(categorySchema.partial(), req.body) }));
});

// ---- Settings ----------------------------------------------------------------

adminRouter.get("/settings", async (_req, res) => {
  ok(res, await getSettings());
});

adminRouter.patch("/settings", async (req, res) => {
  const changes = parse(settingsSchema, req.body);
  const next = { ...(await getSettings()), ...changes };
  // The online advance must always cover our commission (we keep it from the advance).
  if (next.advancePercent < next.commissionPercent) {
    throw ApiError.badRequest("Advance % must be at least the commission %");
  }
  ok(res, await prisma.settings.update({ where: { id: 1 }, data: changes }));
});
