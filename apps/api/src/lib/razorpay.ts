import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env, features, isProd } from "../config/env";
import { logger } from "./logger";

// Razorpay handles UPI, cards and netbanking.
// Without keys (development) we use FAKE payments so you can test bookings
// end to end. Fake mode is impossible in production (see config/env.ts).

const client = features.razorpay
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID!, key_secret: env.RAZORPAY_KEY_SECRET! })
  : null;

export const MOCK_KEY_ID = "mock";
export const MOCK_SIGNATURE = "mock_signature";

export const razorpayKeyId = () => (client ? env.RAZORPAY_KEY_ID! : MOCK_KEY_ID);

export async function createOrder(amount: number, receipt: string, notes: Record<string, string>) {
  if (!client) {
    const id = `order_mock_${crypto.randomBytes(8).toString("hex")}`;
    logger.warn(`💳 [DEV MODE] Fake Razorpay order ${id} for ₹${amount / 100}`);
    return { id };
  }
  const order = await client.orders.create({ amount, currency: "INR", receipt: receipt.slice(0, 40), notes });
  return { id: order.id };
}

/** Proves the payment details sent by the app really came from Razorpay. */
export function isValidCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!client) return !isProd && signature === MOCK_SIGNATURE;
  const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Proves a webhook call really came from Razorpay. Needs the RAW request body. */
export function isValidWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export async function fetchPaymentMethod(paymentId: string): Promise<string | undefined> {
  if (!client) return "upi";
  const payment = await client.payments.fetch(paymentId);
  return payment.method;
}

export async function createRefund(paymentId: string, amount: number, notes: Record<string, string>) {
  if (!client) {
    logger.warn(`💸 [DEV MODE] Fake refund of ₹${amount / 100} for ${paymentId}`);
    return { id: `rfnd_mock_${crypto.randomBytes(8).toString("hex")}`, status: "processed" };
  }
  const refund = await client.payments.refund(paymentId, { amount, notes });
  return { id: refund.id, status: refund.status };
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
