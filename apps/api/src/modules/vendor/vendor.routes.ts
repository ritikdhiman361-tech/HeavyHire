import { Router, type Request } from "express";
import { z } from "zod";
import {
  acceptBookingSchema,
  blockSchema,
  formatBookingNumber,
  machineSchema,
  rejectBookingSchema,
  vendorSchema,
  vendorStatusSchema,
  vendorUpdateSchema,
} from "@heavyhire/shared";
import { prisma } from "../../lib/prisma";
import { requireUser, requireVendor } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { getPagination } from "../../utils/pagination";
import { ok, okList } from "../../utils/respond";
import { parse } from "../../utils/validate";
import { acceptByVendor, advanceByVendor, rejectByVendor } from "../bookings/bookings.service";
import { bookingInclude, vendorView } from "../bookings/bookings.view";
import * as vendor from "./vendor.service";

export const vendorRouter = Router();

// ---- Profile -------------------------------------------------------------

/** Become a vendor (or fix a rejected profile). */
vendorRouter.post("/", requireUser, async (req, res) => {
  ok(res, await vendor.saveVendorProfile(req.user!.id, parse(vendorSchema, req.body)), 201);
});

vendorRouter.get("/", requireUser, async (req, res) => {
  const profile = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
  ok(res, profile ? vendor.vendorProfileView(profile) : null);
});

// Everything below needs a vendor profile (adds req.vendor).
const vendorOnly = Router();
vendorOnly.use(requireVendor());
vendorRouter.use(vendorOnly);

/** Accepting/rejecting/moving bookings needs an APPROVED vendor account. */
function assertApproved(req: Request) {
  if (req.vendor!.status !== "APPROVED") throw ApiError.forbidden("Your vendor account is waiting for approval");
}

vendorOnly.patch("/", async (req, res) => {
  ok(res, await vendor.saveVendorProfile(req.user!.id, parse(vendorUpdateSchema, req.body)));
});

vendorOnly.get("/dashboard", async (req, res) => {
  ok(res, await vendor.getDashboard(req.vendor!.id));
});

// ---- Machines (vendors can add machines while their account is under review) ----

vendorOnly.get("/machines", async (req, res) => {
  ok(res, await vendor.listVendorMachines(req.vendor!.id));
});

vendorOnly.post("/machines", async (req, res) => {
  ok(res, await vendor.createMachine(req.vendor!.id, parse(machineSchema, req.body)), 201);
});

vendorOnly.get("/machines/:id", async (req, res) => {
  ok(res, await vendor.getVendorMachine(req.vendor!.id, req.params.id));
});

vendorOnly.patch("/machines/:id", async (req, res) => {
  ok(res, await vendor.updateMachine(req.vendor!.id, req.params.id, parse(machineSchema, req.body)));
});

vendorOnly.post("/machines/:id/pause", async (req, res) => {
  ok(res, await vendor.setPaused(req.vendor!.id, req.params.id, true));
});

vendorOnly.post("/machines/:id/resume", async (req, res) => {
  ok(res, await vendor.setPaused(req.vendor!.id, req.params.id, false));
});

vendorOnly.post("/machines/:id/blocks", async (req, res) => {
  ok(res, await vendor.addBlock(req.vendor!.id, req.params.id, parse(blockSchema, req.body)), 201);
});

vendorOnly.delete("/machines/:id/blocks/:blockId", async (req, res) => {
  await vendor.removeBlock(req.vendor!.id, req.params.id, req.params.blockId);
  ok(res, { deleted: true });
});

// ---- Bookings (approved vendors only) --------------------------------------

const filterSchema = z.object({ status: z.enum(["new", "upcoming", "ongoing", "past"]).optional() });

vendorOnly.get("/bookings", async (req, res) => {
  const { status } = parse(filterSchema, req.query);
  const { page, limit, skip, take } = getPagination(req.query);
  const where = vendor.vendorBookingWhere(req.vendor!.id, status);
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: status === "past" ? { startAt: "desc" } : { startAt: "asc" },
      skip,
      take,
    }),
    prisma.booking.count({ where }),
  ]);
  okList(res, items.map(vendorView), { page, limit, total });
});

vendorOnly.get("/bookings/:id", async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, vendorId: req.vendor!.id },
    include: bookingInclude,
  });
  if (!booking) throw ApiError.notFound("Booking");
  ok(res, vendorView(booking));
});

vendorOnly.post("/bookings/:id/accept", async (req, res) => {
  assertApproved(req);
  ok(res, await acceptByVendor(req.vendor!.id, req.params.id, parse(acceptBookingSchema, req.body ?? {})));
});

vendorOnly.post("/bookings/:id/reject", async (req, res) => {
  assertApproved(req);
  const { reason } = parse(rejectBookingSchema, req.body);
  ok(res, await rejectByVendor(req.vendor!.id, req.params.id, reason));
});

vendorOnly.post("/bookings/:id/status", async (req, res) => {
  assertApproved(req);
  const { status } = parse(vendorStatusSchema, req.body);
  ok(res, await advanceByVendor(req.vendor!.id, req.params.id, status));
});

// ---- Money -----------------------------------------------------------------

vendorOnly.get("/payouts", async (req, res) => {
  const { page, limit, skip, take } = getPagination(req.query);
  const { items, total, pendingAmount, paidAmount } = await vendor.listPayouts(req.vendor!.id, skip, take);
  res.json({
    success: true,
    data: items.map((p) => ({ ...p, booking: { ...p.booking, bookingNumber: formatBookingNumber(p.booking.bookingNumber) } })),
    meta: { page, limit, total, pendingAmount, paidAmount },
  });
});
