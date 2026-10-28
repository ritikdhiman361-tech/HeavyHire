import { formatBookingNumber } from "@heavyhire/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { getSettings } from "../../lib/settings";
import * as razorpay from "../../lib/razorpay";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { addMinutes, formatIst } from "../../utils/time";
import { notify } from "../notifications/notifications.service";

/**
 * Marks a Razorpay payment as paid and moves the booking to REQUESTED.
 * Called from TWO places (the app after checkout, and Razorpay's webhook),
 * whichever arrives first. Safe to call many times: only the first one acts.
 */
export async function markPaymentPaid(orderId: string, razorpayPaymentId: string) {
  const method = await razorpay.fetchPaymentMethod(razorpayPaymentId).catch(() => undefined);
  const settings = await getSettings();

  const result = await prisma.$transaction(async (tx) => {
    // Only flips CREATED → PAID once, even if two calls arrive together.
    const updated = await tx.payment.updateMany({
      where: { razorpayOrderId: orderId, status: { in: ["CREATED", "FAILED"] } },
      data: { status: "PAID", razorpayPaymentId, method, paidAt: new Date() },
    });
    const payment = await tx.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment) throw ApiError.notFound("Payment");
    if (updated.count === 0) return { payment, firstTime: false, booking: null };

    const booking = await tx.booking.update({
      where: { id: payment.bookingId },
      data: { amountPaid: { increment: payment.amount } },
      include: { machine: { include: { category: true } }, vendor: true },
    });

    if (booking.status === "PENDING_PAYMENT") {
      const moved = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "REQUESTED", vendorReplyBy: addMinutes(new Date(), settings.vendorReplyMinutes) },
        include: { machine: { include: { category: true } }, vendor: true },
      });
      await tx.bookingEvent.create({ data: { bookingId: booking.id, status: "REQUESTED", note: "Payment received" } });
      return { payment, firstTime: true, booking: moved };
    }
    return { payment, firstTime: true, booking };
  });

  const { booking, payment } = result;
  if (!result.firstTime || !booking) return { bookingId: payment.bookingId };

  if (booking.status === "REQUESTED") {
    void notify(booking.vendor.userId, "booking_requested", {
      bookingNo: formatBookingNumber(booking.bookingNumber),
      machine: `${booking.machine.brand} ${booking.machine.model}`,
      when: formatIst(booking.startAt),
      place: booking.siteAddress,
      link: `${env.WEB_URL}/vendor/bookings`,
    });
  } else {
    // The renter paid AFTER the booking was cancelled (e.g. took >30 min).
    // We can't keep money for a cancelled booking, so refund it straight away.
    logger.warn({ bookingId: booking.id }, "Payment for a closed booking, refunding");
    await refundBooking(booking.id, payment.amount, "Payment received after booking was closed");
  }
  return { bookingId: booking.id };
}

/**
 * Refunds up to `amount` paise for a booking, across its paid payments.
 * Returns how much was refunded.
 */
export async function refundBooking(bookingId: string, amount: number, reason: string): Promise<number> {
  if (amount <= 0) return 0;
  const payments = await prisma.payment.findMany({
    where: { bookingId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
    orderBy: { createdAt: "asc" },
  });

  let left = amount;
  for (const payment of payments) {
    const refundable = payment.amount - payment.refundedAmount;
    const take = Math.min(refundable, left);
    if (take <= 0 || !payment.razorpayPaymentId) continue;

    const refund = await razorpay.createRefund(payment.razorpayPaymentId, take, { bookingId, reason: reason.slice(0, 200) });
    const refundedAmount = payment.refundedAmount + take;
    await prisma.$transaction([
      prisma.refund.create({
        data: {
          paymentId: payment.id,
          amount: take,
          reason,
          razorpayRefundId: refund.id,
          status: refund.status === "processed" ? "PROCESSED" : "PENDING",
        },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: { refundedAmount, status: refundedAmount >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      }),
    ]);
    left -= take;
    if (left <= 0) break;
  }
  return amount - left;
}

/** Total paid online minus everything refunded. */
export async function netPaid(bookingId: string, db: Prisma.TransactionClient = prisma) {
  const payments = await db.payment.findMany({
    where: { bookingId, status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
  });
  return payments.reduce((sum, p) => sum + p.amount - p.refundedAmount, 0);
}
