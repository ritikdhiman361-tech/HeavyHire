import type { PaymentPlan, PricingUnit } from "./constants";

// The ONE place where a booking's price is calculated.
// The website uses it for the preview, the API uses it to save the booking,
// so the renter always pays exactly what they saw.

export interface PriceInput {
  unit: PricingUnit;
  quantity: number; // hours or days
  pricePerHour: number | null; // paise
  pricePerDay: number | null; // paise
  transportCharge: number; // paise, one-time
  gstPercent: number; // e.g. 18
  commissionPercent: number; // e.g. 10
  advancePercent: number; // e.g. 25
  paymentPlan: PaymentPlan;
}

export interface PriceBreakdown {
  rate: number;
  quantity: number;
  rentAmount: number;
  transportAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number; // what the renter pays in total
  commissionAmount: number; // HeavyHire's cut (from rent only)
  vendorAmount: number; // total − commission
  payNowAmount: number; // charged online now
  payAtSiteAmount: number; // ADVANCE plan: paid to the operator at site
}

export class PricingError extends Error {}

export function calculatePrice(input: PriceInput): PriceBreakdown {
  const rate = input.unit === "HOUR" ? input.pricePerHour : input.pricePerDay;
  if (rate == null || rate <= 0) {
    throw new PricingError(`This machine is not available per ${input.unit.toLowerCase()}`);
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new PricingError("Quantity must be a whole number of at least 1");
  }

  const rentAmount = rate * input.quantity;
  const transportAmount = input.transportCharge;
  const subtotal = rentAmount + transportAmount;
  const gstAmount = Math.round((subtotal * input.gstPercent) / 100);
  const totalAmount = subtotal + gstAmount;
  const commissionAmount = Math.round((rentAmount * input.commissionPercent) / 100);
  const vendorAmount = totalAmount - commissionAmount;

  // ADVANCE: renter pays a part online now (this always covers our commission,
  // see the admin settings rule), and the rest directly to the operator at site.
  const payNowAmount =
    input.paymentPlan === "FULL"
      ? totalAmount
      : Math.max(Math.round((totalAmount * input.advancePercent) / 100), commissionAmount);

  return {
    rate,
    quantity: input.quantity,
    rentAmount,
    transportAmount,
    gstPercent: input.gstPercent,
    gstAmount,
    totalAmount,
    commissionAmount,
    vendorAmount,
    payNowAmount,
    payAtSiteAmount: totalAmount - payNowAmount,
  };
}
