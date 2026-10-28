import express, { Router } from "express";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { isValidWebhookSignature } from "../../lib/razorpay";
import { markPaymentPaid } from "../payments/payments.service";

export const webhooksRouter = Router();

interface RazorpayEvent {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string } };
    refund?: { entity: { id: string } };
  };
}

/**
 * Razorpay calls this when a payment or refund changes, even if the renter
 * closed the app halfway. Set it up in Razorpay Dashboard → Webhooks with
 * events: payment.captured, refund.processed, refund.failed.
 *
 * The signature check needs the RAW body, so this route reads it itself.
 */
webhooksRouter.post("/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("x-razorpay-signature") ?? "";
  if (!Buffer.isBuffer(req.body) || !isValidWebhookSignature(req.body, signature)) {
    return res.status(400).json({ success: false, error: { code: "BAD_SIGNATURE", message: "Invalid signature" } });
  }

  const event = JSON.parse(req.body.toString("utf8")) as RazorpayEvent;
  logger.info({ event: event.event }, "Razorpay webhook");

  if (event.event === "payment.captured" && event.payload.payment) {
    const { id, order_id } = event.payload.payment.entity;
    const known = await prisma.payment.findUnique({ where: { razorpayOrderId: order_id } });
    if (known) await markPaymentPaid(order_id, id);
  }
  if ((event.event === "refund.processed" || event.event === "refund.failed") && event.payload.refund) {
    await prisma.refund.updateMany({
      where: { razorpayRefundId: event.payload.refund.entity.id },
      data: { status: event.event === "refund.processed" ? "PROCESSED" : "FAILED" },
    });
  }

  // Always answer 200 quickly, or Razorpay will keep retrying.
  res.json({ received: true });
});
