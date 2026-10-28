import {
  ACTIVE_BOOKING_STATUSES,
  LIMITS,
  VENDOR_STATUS_FLOW,
  calculatePrice,
  formatBookingNumber,
  formatRupees,
  type PaymentPlan,
  type PricingUnit,
} from "@heavyhire/shared";
import type { Booking, BookingStatus, Machine, Prisma, Settings } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getSettings } from "../../lib/settings";
import * as razorpay from "../../lib/razorpay";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { addHours, addMinutes, formatIst } from "../../utils/time";
import { distanceKm } from "../../utils/geo";
import { notify } from "../notifications/notifications.service";
import { netPaid, refundBooking } from "../payments/payments.service";

type Tx = Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// PRICE & AVAILABILITY
// ---------------------------------------------------------------------------

/** Works out the price for a machine using the current platform settings. */
export function priceFor(machine: Machine, settings: Settings, unit: PricingUnit, quantity: number, plan: PaymentPlan) {
  if (unit === "HOUR" && quantity < machine.minHours) {
    throw ApiError.badRequest(`Minimum booking is ${machine.minHours} hours`, "BELOW_MINIMUM");
  }
  return calculatePrice({
    unit,
    quantity,
    pricePerHour: machine.pricePerHour,
    pricePerDay: machine.pricePerDay,
    transportCharge: machine.transportCharge,
    gstPercent: settings.gstPercent,
    commissionPercent: settings.commissionPercent,
    advancePercent: settings.advancePercent,
    paymentPlan: plan,
  });
}

/** Booking end time. Days are counted as full 24-hour days. */
export function bookingEnd(startAt: Date, unit: PricingUnit, quantity: number) {
  return addHours(startAt, unit === "HOUR" ? quantity : quantity * 24);
}

/** True if another booking or a vendor block overlaps [startAt, endAt). */
export async function isMachineBusy(db: Tx, machineId: string, startAt: Date, endAt: Date, ignoreBookingId?: string) {
  const [booking, block] = await Promise.all([
    db.booking.findFirst({
      where: {
        machineId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
      },
      select: { id: true },
    }),
    db.machineBlock.findFirst({
      where: { machineId, startAt: { lt: endAt }, endAt: { gt: startAt } },
      select: { id: true },
    }),
  ]);
  return Boolean(booking || block);
}

/** A machine that can be booked right now (approved, vendor approved and not blocked). */
export async function getBookableMachine(machineId: string) {
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, status: "APPROVED", vendor: { status: "APPROVED", user: { isBlocked: false } } },
    include: { vendor: true, category: true },
  });
  if (!machine) throw ApiError.notFound("Machine");
  return machine;
}

// ---------------------------------------------------------------------------
// CREATE (renter)
// ---------------------------------------------------------------------------

interface CreateInput {
  machineId: string;
  unit: PricingUnit;
  quantity: number;
  startAt: Date;
  siteAddress: string;
  siteLat: number;
  siteLng: number;
  notes?: string;
  paymentPlan: PaymentPlan;
}

export async function createBooking(renterId: string, input: CreateInput) {
  const machine = await getBookableMachine(input.machineId);
  if (machine.vendor.userId === renterId) throw ApiError.badRequest("You can't book your own machine");

  if (input.startAt < addMinutes(new Date(), 60)) {
    throw ApiError.badRequest("Start time must be at least 1 hour from now", "START_TOO_SOON");
  }
  const km = distanceKm(machine.lat, machine.lng, input.siteLat, input.siteLng);
  if (km > machine.serviceRadiusKm) {
    throw ApiError.badRequest(`This machine only works within ${machine.serviceRadiusKm} km of its base`, "OUT_OF_AREA");
  }

  const settings = await getSettings();
  const price = priceFor(machine, settings, input.unit, input.quantity, input.paymentPlan);
  const endAt = bookingEnd(input.startAt, input.unit, input.quantity);

  const booking = await prisma.$transaction(async (tx) => {
    // Lock the machine row so two people can't book the same slot at the same moment.
    await tx.$queryRaw`SELECT id FROM "Machine" WHERE id = ${machine.id} FOR UPDATE`;

    // If this renter left an unpaid booking for this machine, drop it so they can retry.
    await tx.booking.updateMany({
      where: { renterId, machineId: machine.id, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", cancelReason: "Replaced by a new booking attempt" },
    });

    if (await isMachineBusy(tx, machine.id, input.startAt, endAt)) {
      throw ApiError.conflict("This machine is already booked for that time", "MACHINE_NOT_AVAILABLE");
    }

    const created = await tx.booking.create({
      data: {
        renterId,
        machineId: machine.id,
        vendorId: machine.vendorId,
        unit: input.unit,
        quantity: input.quantity,
        startAt: input.startAt,
        endAt,
        siteAddress: input.siteAddress,
        siteLat: input.siteLat,
        siteLng: input.siteLng,
        notes: input.notes,
        rate: price.rate,
        rentAmount: price.rentAmount,
        transportAmount: price.transportAmount,
        gstPercent: price.gstPercent,
        gstAmount: price.gstAmount,
        totalAmount: price.totalAmount,
        commissionAmount: price.commissionAmount,
        vendorAmount: price.vendorAmount,
        paymentPlan: input.paymentPlan,
        payNowAmount: price.payNowAmount,
        payAtSiteAmount: price.payAtSiteAmount,
        events: { create: { status: "PENDING_PAYMENT", actorId: renterId } },
      },
    });

    const order = await razorpay.createOrder(price.payNowAmount, formatBookingNumber(created.bookingNumber), {
      bookingId: created.id,
    });
    await tx.payment.create({
      data: {
        bookingId: created.id,
        kind: input.paymentPlan,
        amount: price.payNowAmount,
        razorpayOrderId: order.id,
      },
    });
    return { ...created, razorpayOrderId: order.id };
  });

  return {
    booking: {
      id: booking.id,
      bookingNumber: formatBookingNumber(booking.bookingNumber),
      status: booking.status,
      totalAmount: booking.totalAmount,
      payNowAmount: booking.payNowAmount,
    },
    payment: { razorpayOrderId: booking.razorpayOrderId, amount: booking.payNowAmount, keyId: razorpay.razorpayKeyId() },
  };
}

// ---------------------------------------------------------------------------
// STATUS CHANGES
// ---------------------------------------------------------------------------

/** Which status can follow which. Anything else is refused. */
const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ["REQUESTED", "CANCELLED"],
  REQUESTED: ["CONFIRMED", "REJECTED", "EXPIRED", "CANCELLED"],
  CONFIRMED: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["WORKING", "CANCELLED"],
  WORKING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

/**
 * Moves a booking from one status to another and records it in the timeline.
 * Uses "update only if still in the old status", so two actions at the same
 * moment (e.g. vendor accepts just as it expires) can't both win.
 */
async function changeStatus(
  tx: Tx,
  booking: Pick<Booking, "id" | "status">,
  to: BookingStatus,
  actorId: string | null,
  note?: string,
  data: Prisma.BookingUpdateManyMutationInput = {},
) {
  if (!ALLOWED[booking.status].includes(to)) {
    throw ApiError.conflict(`Booking can't go from ${booking.status} to ${to}`, "INVALID_STATUS");
  }
  const { count } = await tx.booking.updateMany({
    where: { id: booking.id, status: booking.status },
    data: { ...data, status: to },
  });
  if (count === 0) throw ApiError.conflict("This booking was just updated. Please refresh.", "STALE_BOOKING");
  await tx.bookingEvent.create({ data: { bookingId: booking.id, status: to, actorId, note } });
}

const label = (b: { bookingNumber: number; machine: { brand: string; model: string } }) => ({
  bookingNo: formatBookingNumber(b.bookingNumber),
  machine: `${b.machine.brand} ${b.machine.model}`,
});

/** How much a renter gets back if they cancel now. */
export function refundOnRenterCancel(
  booking: Pick<Booking, "status" | "startAt">,
  paid: number,
  settings: Settings,
  now = new Date(),
) {
  if (booking.status === "PENDING_PAYMENT" || booking.status === "REQUESTED") return paid;
  const hoursBefore = (booking.startAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursBefore >= settings.freeCancelHoursBefore) return paid;
  return Math.round((paid * settings.lateCancelRefundPercent) / 100);
}

export async function cancelByRenter(renterId: string, bookingId: string, reason?: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, renterId },
    include: { machine: true, vendor: true },
  });
  if (!booking) throw ApiError.notFound("Booking");
  if (!["PENDING_PAYMENT", "REQUESTED", "CONFIRMED"].includes(booking.status)) {
    throw ApiError.badRequest("This booking can't be cancelled now. Please call support.", "CANNOT_CANCEL");
  }

  const settings = await getSettings();
  const paid = await netPaid(booking.id);
  const refund = refundOnRenterCancel(booking, paid, settings);

  await prisma.$transaction((tx) =>
    changeStatus(tx, booking, "CANCELLED", renterId, reason ?? "Cancelled by renter", { cancelReason: reason ?? "Cancelled by renter" }),
  );
  const refunded = await refundBooking(booking.id, refund, "Cancelled by renter");

  if (booking.status !== "PENDING_PAYMENT") {
    void notify(booking.vendor.userId, "booking_cancelled", { ...label(booking), reason: "The renter cancelled." });
  }
  return { cancelled: true, refundAmount: refunded };
}

export async function acceptByVendor(vendorId: string, bookingId: string, operator: { operatorName?: string; operatorPhone?: string }) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, vendorId },
    include: { machine: true, vendor: { include: { user: true } } },
  });
  if (!booking) throw ApiError.notFound("Booking");
  if (booking.vendorReplyBy && booking.vendorReplyBy < new Date()) {
    throw ApiError.badRequest("Too late, this request has expired", "REQUEST_EXPIRED");
  }

  // If no operator is given, the vendor's own name and phone are shown to the renter.
  const operatorName = operator.operatorName || booking.vendor.businessName;
  const operatorPhone = operator.operatorPhone
    ? operator.operatorPhone.replace(/^(?!\+91)/, "+91")
    : booking.vendor.user.phone;

  await prisma.$transaction((tx) =>
    changeStatus(tx, booking, "CONFIRMED", booking.vendor.userId, undefined, { operatorName, operatorPhone }),
  );
  void notify(booking.renterId, "booking_confirmed", {
    ...label(booking),
    when: formatIst(booking.startAt),
    name: operatorName,
    phone: operatorPhone,
  });
  return { status: "CONFIRMED" as const };
}

export async function rejectByVendor(vendorId: string, bookingId: string, reason: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, vendorId }, include: { machine: true, vendor: true } });
  if (!booking) throw ApiError.notFound("Booking");

  await prisma.$transaction((tx) =>
    changeStatus(tx, booking, "REJECTED", booking.vendor.userId, reason, { rejectedReason: reason }),
  );
  const refunded = await refundBooking(booking.id, await netPaid(booking.id), "Rejected by vendor");
  void notify(booking.renterId, "booking_rejected", { ...label(booking), amount: formatRupees(refunded) });
  return { status: "REJECTED" as const };
}

/** Vendor taps the next button: On the way → Working → Job done. */
export async function advanceByVendor(vendorId: string, bookingId: string, to: "ON_THE_WAY" | "WORKING" | "COMPLETED") {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, vendorId }, include: { machine: true, vendor: true } });
  if (!booking) throw ApiError.notFound("Booking");
  if (VENDOR_STATUS_FLOW[booking.status] !== to) {
    throw ApiError.conflict(`Next step for this booking is ${VENDOR_STATUS_FLOW[booking.status] ?? "none"}`, "INVALID_STATUS");
  }

  await prisma.$transaction(async (tx) => {
    await changeStatus(tx, booking, to, booking.vendor.userId);
    if (to === "COMPLETED") {
      // Vendor earns what was paid online minus our commission.
      // (On the ADVANCE plan the rest was collected by them at site.)
      const amount = Math.max((await netPaid(booking.id, tx)) - booking.commissionAmount, 0);
      await tx.payout.create({ data: { vendorId, bookingId: booking.id, amount } });
    }
  });

  const info = label(booking);
  if (to === "ON_THE_WAY") {
    void notify(booking.renterId, "booking_on_the_way", { ...info, name: booking.operatorName ?? "", phone: booking.operatorPhone ?? "" });
  } else if (to === "WORKING") {
    void notify(booking.renterId, "booking_working", info);
  } else {
    void notify(booking.renterId, "booking_completed", { ...info, link: `${env.WEB_URL}/bookings/${booking.id}` });
  }
  return { status: to };
}

/** Admin can cancel any open booking and choose the refund. */
export async function cancelByAdmin(adminId: string, bookingId: string, reason: string, refundAmount?: number) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { machine: true, vendor: true } });
  if (!booking) throw ApiError.notFound("Booking");

  const paid = await netPaid(booking.id);
  await prisma.$transaction((tx) => changeStatus(tx, booking, "CANCELLED", adminId, reason, { cancelReason: reason }));
  const refunded = await refundBooking(booking.id, Math.min(refundAmount ?? paid, paid), `Cancelled by HeavyHire: ${reason}`);

  const info = { ...label(booking), reason: refunded ? `Refund of ${formatRupees(refunded)} has started.` : reason };
  if (booking.status !== "PENDING_PAYMENT") {
    void notify(booking.renterId, "booking_cancelled", info);
    void notify(booking.vendor.userId, "booking_cancelled", { ...label(booking), reason });
  }
  return { cancelled: true, refundAmount: refunded };
}

// ---------------------------------------------------------------------------
// BACKGROUND JOBS
// ---------------------------------------------------------------------------

/** REQUESTED bookings the vendor didn't answer in time → EXPIRED + full refund. */
export async function expireUnansweredBookings() {
  const overdue = await prisma.booking.findMany({
    where: { status: "REQUESTED", vendorReplyBy: { lt: new Date() } },
    include: { machine: true },
    take: 100,
  });
  for (const booking of overdue) {
    try {
      await prisma.$transaction((tx) => changeStatus(tx, booking, "EXPIRED", null, "Vendor did not reply in time"));
    } catch {
      continue; // vendor answered at the same moment; nothing to do
    }
    const refunded = await refundBooking(booking.id, await netPaid(booking.id), "Vendor did not reply");
    void notify(booking.renterId, "booking_expired", { ...label(booking), amount: formatRupees(refunded) });
  }
  return overdue.length;
}

/** Unpaid bookings older than 30 minutes stop holding the machine's dates. */
export async function cancelUnpaidBookings() {
  const cutoff = addMinutes(new Date(), -LIMITS.unpaidBookingMinutes);
  const stale = await prisma.booking.findMany({ where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } }, take: 200 });
  for (const booking of stale) {
    await prisma
      .$transaction((tx) => changeStatus(tx, booking, "CANCELLED", null, "Payment not completed", { cancelReason: "Payment not completed" }))
      .catch(() => undefined);
  }
  return stale.length;
}

/** WhatsApp the vendor about jobs starting in the next 2 hours (once per booking). */
export async function sendVendorReminders() {
  const now = new Date();
  const soon = await prisma.booking.findMany({
    where: { status: "CONFIRMED", reminderSentAt: null, startAt: { gt: now, lt: addHours(now, 2) } },
    include: { machine: true, vendor: true },
    take: 200,
  });
  for (const booking of soon) {
    await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: now } });
    void notify(booking.vendor.userId, "vendor_reminder", {
      ...label(booking),
      when: formatIst(booking.startAt),
      place: booking.siteAddress,
    });
  }
  return soon.length;
}
