// Opens the Razorpay payment window (UPI, cards, netbanking).
// In dev mode (API has no Razorpay keys) the payment is simulated.

export interface PaymentResult {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface CheckoutOptions {
  keyId: string;
  orderId: string;
  amount: number; // paise
  description: string;
  phone?: string;
  name?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not open payment. Check your internet."));
    document.body.appendChild(s);
  });
}

export class PaymentCancelled extends Error {}

export async function payWithRazorpay(o: CheckoutOptions): Promise<PaymentResult> {
  if (o.keyId === "mock") {
    await new Promise((r) => setTimeout(r, 800)); // feel like a real payment
    return { razorpayOrderId: o.orderId, razorpayPaymentId: `pay_mock_${Date.now()}`, razorpaySignature: "mock_signature" };
  }

  await loadScript();
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: o.keyId,
      order_id: o.orderId,
      amount: o.amount,
      currency: "INR",
      name: "HeavyHire",
      description: o.description,
      prefill: { contact: o.phone, name: o.name },
      theme: { color: "#f5b301" },
      handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
        resolve({
          razorpayOrderId: r.razorpay_order_id,
          razorpayPaymentId: r.razorpay_payment_id,
          razorpaySignature: r.razorpay_signature,
        }),
      modal: { ondismiss: () => reject(new PaymentCancelled("Payment cancelled")) },
    });
    checkout.open();
  });
}
