import { describe, expect, it } from "vitest";
import { calculatePrice } from "./pricing";
import { formatRupees } from "./money";
import { phoneSchema } from "./schemas/common";

const base = {
  pricePerHour: 100000, // ₹1,000/hr
  pricePerDay: 700000,
  transportCharge: 0,
  gstPercent: 18,
  commissionPercent: 10,
  advancePercent: 25,
};

describe("calculatePrice", () => {
  it("prices an 8-hour JCB booking, paid in full", () => {
    const p = calculatePrice({ ...base, unit: "HOUR", quantity: 8, paymentPlan: "FULL" });
    expect(p.rentAmount).toBe(800000);
    expect(p.gstAmount).toBe(144000);
    expect(p.totalAmount).toBe(944000);
    expect(p.commissionAmount).toBe(80000);
    expect(p.vendorAmount).toBe(864000);
    expect(p.payNowAmount).toBe(944000);
    expect(p.payAtSiteAmount).toBe(0);
  });

  it("splits an advance booking into pay-now and pay-at-site", () => {
    const p = calculatePrice({ ...base, unit: "DAY", quantity: 2, transportCharge: 300000, paymentPlan: "ADVANCE" });
    expect(p.totalAmount).toBe(2006000); // (14,000 + 3,000) × 1.18
    expect(p.payNowAmount).toBe(501500);
    expect(p.payNowAmount + p.payAtSiteAmount).toBe(p.totalAmount);
  });

  it("advance always covers the commission", () => {
    const p = calculatePrice({ ...base, advancePercent: 5, commissionPercent: 20, unit: "HOUR", quantity: 4, paymentPlan: "ADVANCE" });
    expect(p.payNowAmount).toBeGreaterThanOrEqual(p.commissionAmount);
  });

  it("refuses a unit the machine has no price for", () => {
    expect(() => calculatePrice({ ...base, pricePerDay: null, unit: "DAY", quantity: 1, paymentPlan: "FULL" })).toThrow();
  });
});

describe("helpers", () => {
  it("formats rupees the Indian way", () => {
    expect(formatRupees(12345600)).toBe("₹1,23,456");
    expect(formatRupees(944050)).toBe("₹9,440.50");
  });
  it("normalises phone numbers", () => {
    expect(phoneSchema.parse("98765 43210")).toBe("+919876543210");
    expect(phoneSchema.parse("+91-9876543210")).toBe("+919876543210");
    expect(phoneSchema.safeParse("12345").success).toBe(false);
  });
});
