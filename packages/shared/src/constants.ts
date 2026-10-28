// Values shared by the API and the website. Keep these in sync with
// the enums in apps/api/prisma/schema.prisma.

export const BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "REQUESTED",
  "CONFIRMED",
  "ON_THE_WAY",
  "WORKING",
  "COMPLETED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Bookings in these statuses keep the machine busy for their dates. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "PENDING_PAYMENT",
  "REQUESTED",
  "CONFIRMED",
  "ON_THE_WAY",
  "WORKING",
];

/** The order a vendor moves a booking forward, one tap at a time. */
export const VENDOR_STATUS_FLOW: Partial<Record<BookingStatus, BookingStatus>> = {
  CONFIRMED: "ON_THE_WAY",
  ON_THE_WAY: "WORKING",
  WORKING: "COMPLETED",
};

export const PRICING_UNITS = ["HOUR", "DAY"] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

export const PAYMENT_PLANS = ["FULL", "ADVANCE"] as const;
export type PaymentPlan = (typeof PAYMENT_PLANS)[number];

export const UPLOAD_PURPOSES = ["photo", "document"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const LIMITS = {
  maxPhotosPerMachine: 10,
  minPhotosPerMachine: 1,
  maxHoursPerBooking: 12, // hourly bookings are within one day
  maxDaysPerBooking: 30,
  maxUploadBytes: 8 * 1024 * 1024, // 8 MB
  otpLength: 6,
  otpTtlMinutes: 5,
  otpMaxAttempts: 5,
  unpaidBookingMinutes: 30, // unpaid bookings free their dates after this
} as const;

/** Bookings are shown to people as HH-1001, HH-1002... */
export function formatBookingNumber(n: number): string {
  return `HH-${1000 + n}`;
}
