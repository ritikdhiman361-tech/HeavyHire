import { formatBookingNumber } from "@heavyhire/shared";
import type { Prisma } from "@prisma/client";

// What we include when loading a booking, and how we shape it for the app.
// Phone numbers are only shared once the booking is confirmed, so nobody
// can skip the platform before paying.

export const bookingInclude = {
  machine: {
    select: {
      id: true,
      brand: true,
      model: true,
      year: true,
      area: true,
      category: { select: { slug: true, nameEn: true, nameHi: true } },
      photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  },
  vendor: { select: { id: true, businessName: true, user: { select: { phone: true } } } },
  renter: { select: { id: true, name: true, phone: true } },
  events: { orderBy: { createdAt: "asc" }, select: { status: true, note: true, createdAt: true } },
  payments: { select: { amount: true, refundedAmount: true, status: true, method: true, paidAt: true } },
  review: { select: { rating: true, comment: true, createdAt: true } },
} satisfies Prisma.BookingInclude;

type FullBooking = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

const CONTACT_VISIBLE = new Set(["CONFIRMED", "ON_THE_WAY", "WORKING", "COMPLETED"]);

function base(b: FullBooking) {
  const refunded = b.payments.reduce((s, p) => s + p.refundedAmount, 0);
  return {
    id: b.id,
    bookingNumber: formatBookingNumber(b.bookingNumber),
    status: b.status,
    unit: b.unit,
    quantity: b.quantity,
    startAt: b.startAt,
    endAt: b.endAt,
    siteAddress: b.siteAddress,
    siteLat: b.siteLat,
    siteLng: b.siteLng,
    notes: b.notes,
    price: {
      rate: b.rate,
      rentAmount: b.rentAmount,
      transportAmount: b.transportAmount,
      gstPercent: b.gstPercent,
      gstAmount: b.gstAmount,
      totalAmount: b.totalAmount,
      paymentPlan: b.paymentPlan,
      payNowAmount: b.payNowAmount,
      payAtSiteAmount: b.payAtSiteAmount,
      amountPaid: b.amountPaid,
      refundedAmount: refunded,
    },
    machine: {
      id: b.machine.id,
      name: `${b.machine.brand} ${b.machine.model}`,
      year: b.machine.year,
      area: b.machine.area,
      category: b.machine.category,
      photo: b.machine.photos[0]?.url ?? null,
    },
    vendorReplyBy: b.vendorReplyBy,
    cancelReason: b.cancelReason,
    rejectedReason: b.rejectedReason,
    events: b.events,
    review: b.review,
    createdAt: b.createdAt,
  };
}

/** For the renter who made the booking. */
export function renterView(b: FullBooking) {
  const showContact = CONTACT_VISIBLE.has(b.status);
  return {
    ...base(b),
    vendor: {
      businessName: b.vendor.businessName,
      phone: showContact ? b.vendor.user.phone : null,
    },
    operator: showContact ? { name: b.operatorName, phone: b.operatorPhone } : null,
    canCancel: ["PENDING_PAYMENT", "REQUESTED", "CONFIRMED"].includes(b.status),
    canReview: b.status === "COMPLETED" && !b.review,
  };
}

/** For the vendor who owns the machine. */
export function vendorView(b: FullBooking) {
  const showContact = CONTACT_VISIBLE.has(b.status);
  return {
    ...base(b),
    renter: { name: b.renter.name ?? "Customer", phone: showContact ? b.renter.phone : null },
    operator: { name: b.operatorName, phone: b.operatorPhone },
    commissionAmount: b.commissionAmount,
    vendorAmount: b.vendorAmount,
  };
}

/** For admins: everything. */
export function adminView(b: FullBooking) {
  return {
    ...base(b),
    renter: b.renter,
    vendor: { id: b.vendor.id, businessName: b.vendor.businessName, phone: b.vendor.user.phone },
    operator: { name: b.operatorName, phone: b.operatorPhone },
    commissionAmount: b.commissionAmount,
    vendorAmount: b.vendorAmount,
    payments: b.payments,
  };
}
