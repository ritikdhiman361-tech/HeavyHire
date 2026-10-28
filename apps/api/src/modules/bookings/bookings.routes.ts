import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { cancelSchema, createBookingSchema, reviewSchema, verifyPaymentSchema } from "@heavyhire/shared";
import { prisma } from "../../lib/prisma";
import { isValidCheckoutSignature } from "../../lib/razorpay";
import { requireUser } from "../../middleware/auth";
import { ApiError } from "../../utils/ApiError";
import { getPagination } from "../../utils/pagination";
import { ok, okList } from "../../utils/respond";
import { parse } from "../../utils/validate";
import { markPaymentPaid } from "../payments/payments.service";
import { createReview } from "../reviews/reviews.service";
import { cancelByRenter, createBooking } from "./bookings.service";
import { bookingInclude, renterView } from "./bookings.view";

export const bookingsRouter = Router();
bookingsRouter.use(requireUser);

/** Step 3 of booking: create it and get a Razorpay order to pay. */
bookingsRouter.post("/", async (req, res) => {
  const body = parse(createBookingSchema, req.body);
  ok(res, await createBooking(req.user!.id, body), 201);
});

/** After Razorpay checkout succeeds, the app sends us the payment proof. */
bookingsRouter.post("/:id/payments/verify", async (req, res) => {
  const body = parse(verifyPaymentSchema, req.body);
  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: body.razorpayOrderId, booking: { id: req.params.id, renterId: req.user!.id } },
  });
  if (!payment) throw ApiError.notFound("Payment");
  if (!isValidCheckoutSignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature)) {
    throw ApiError.badRequest("Payment could not be verified", "PAYMENT_INVALID");
  }
  await markPaymentPaid(body.razorpayOrderId, body.razorpayPaymentId);
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: req.params.id }, include: bookingInclude });
  ok(res, renterView(booking));
});

const listSchema = z.object({ status: z.enum(["active", "past"]).optional() });

/** My bookings, newest first. */
bookingsRouter.get("/", async (req, res) => {
  const { status } = parse(listSchema, req.query);
  const { page, limit, skip, take } = getPagination(req.query);
  const where: Prisma.BookingWhereInput = {
    renterId: req.user!.id,
    status:
      status === "active"
        ? { in: ["REQUESTED", "CONFIRMED", "ON_THE_WAY", "WORKING"] }
        : status === "past"
          ? { in: ["COMPLETED", "REJECTED", "EXPIRED", "CANCELLED"] }
          : { not: "PENDING_PAYMENT" },
  };
  const [items, total] = await Promise.all([
    prisma.booking.findMany({ where, include: bookingInclude, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.booking.count({ where }),
  ]);
  okList(res, items.map(renterView), { page, limit, total });
});

bookingsRouter.get("/:id", async (req, res) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, renterId: req.user!.id },
    include: bookingInclude,
  });
  if (!booking) throw ApiError.notFound("Booking");
  ok(res, renterView(booking));
});

bookingsRouter.post("/:id/cancel", async (req, res) => {
  const { reason } = parse(cancelSchema, req.body ?? {});
  ok(res, await cancelByRenter(req.user!.id, req.params.id, reason));
});

bookingsRouter.post("/:id/review", async (req, res) => {
  const { rating, comment } = parse(reviewSchema, req.body);
  ok(res, await createReview(req.user!.id, req.params.id, rating, comment), 201);
});
