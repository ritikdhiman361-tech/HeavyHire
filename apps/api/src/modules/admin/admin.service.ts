import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { documentViewUrl } from "../../lib/storage";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { notify } from "../notifications/notifications.service";

// ---------------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------------

export async function getStats(from: Date, to: Date) {
  const inRange = { createdAt: { gte: from, lt: to } };
  const completed = { ...inRange, status: "COMPLETED" as const };

  const [byStatus, money, topMachines, byCategory, pendingVendors, pendingMachines, users] = await Promise.all([
    prisma.booking.groupBy({ by: ["status"], where: { ...inRange, status: { not: "PENDING_PAYMENT" } }, _count: true }),
    prisma.booking.aggregate({ where: completed, _sum: { totalAmount: true, commissionAmount: true }, _count: true }),
    prisma.booking.groupBy({
      by: ["machineId"],
      where: completed,
      _count: true,
      _sum: { totalAmount: true },
      orderBy: { _count: { machineId: "desc" } },
      take: 5,
    }),
    prisma.$queryRaw<{ name: string; bookings: bigint }[]>`
      SELECT c."nameEn" AS name, COUNT(b.id) AS bookings
      FROM "Booking" b JOIN "Machine" m ON m.id = b."machineId" JOIN "Category" c ON c.id = m."categoryId"
      WHERE b.status = 'COMPLETED' AND b."createdAt" >= ${from} AND b."createdAt" < ${to}
      GROUP BY c."nameEn" ORDER BY bookings DESC`,
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.machine.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: inRange }),
  ]);

  const machines = await prisma.machine.findMany({
    where: { id: { in: topMachines.map((t) => t.machineId) } },
    select: { id: true, brand: true, model: true, vendor: { select: { businessName: true } } },
  });

  return {
    bookingsByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    completedBookings: money._count,
    gmv: money._sum.totalAmount ?? 0, // total value of completed bookings
    revenue: money._sum.commissionAmount ?? 0, // HeavyHire's commission
    newUsers: users,
    pendingApprovals: { vendors: pendingVendors, machines: pendingMachines },
    topMachines: topMachines.map((t) => {
      const m = machines.find((x) => x.id === t.machineId);
      return {
        id: t.machineId,
        name: m ? `${m.brand} ${m.model}` : "Deleted",
        vendor: m?.vendor.businessName,
        bookings: t._count,
        value: t._sum.totalAmount ?? 0,
      };
    }),
    topCategories: byCategory.map((c) => ({ name: c.name, bookings: Number(c.bookings) })),
  };
}

// ---------------------------------------------------------------------------
// VENDORS
// ---------------------------------------------------------------------------

export async function getVendorForReview(id: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, phone: true, name: true, isBlocked: true, createdAt: true } },
      machines: { select: { id: true, brand: true, model: true, status: true } },
    },
  });
  if (!vendor) throw ApiError.notFound("Vendor");
  const { idDocKey, ...rest } = vendor;
  return { ...rest, idDocUrl: documentViewUrl(idDocKey) };
}

export async function reviewVendor(id: string, approve: boolean, reason?: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw ApiError.notFound("Vendor");

  const updated = await prisma.vendor.update({
    where: { id },
    data: approve
      ? { status: "APPROVED", approvedAt: new Date(), rejectionReason: null }
      : { status: "REJECTED", rejectionReason: reason },
  });
  if (approve) {
    void notify(vendor.userId, "vendor_approved", { name: vendor.businessName, link: `${env.WEB_URL}/vendor/machines` });
  } else {
    void notify(vendor.userId, "vendor_rejected", { reason, link: `${env.WEB_URL}/vendor/profile` });
  }
  return updated;
}

// ---------------------------------------------------------------------------
// MACHINES
// ---------------------------------------------------------------------------

export async function getMachineForReview(id: string) {
  const machine = await prisma.machine.findUnique({
    where: { id },
    include: {
      category: true,
      photos: { orderBy: { sortOrder: "asc" } },
      vendor: { select: { id: true, businessName: true, status: true, user: { select: { phone: true } } } },
    },
  });
  if (!machine) throw ApiError.notFound("Machine");
  const { rcDocKey, ...rest } = machine;
  return { ...rest, rcDocUrl: documentViewUrl(rcDocKey) };
}

export async function reviewMachine(id: string, approve: boolean, reason?: string) {
  const machine = await prisma.machine.findUnique({ where: { id }, include: { vendor: true } });
  if (!machine) throw ApiError.notFound("Machine");

  const updated = await prisma.machine.update({
    where: { id },
    data: approve ? { status: "APPROVED", rejectionReason: null } : { status: "REJECTED", rejectionReason: reason },
  });
  const name = `${machine.brand} ${machine.model}`;
  if (approve) void notify(machine.vendor.userId, "machine_approved", { machine: name });
  else void notify(machine.vendor.userId, "machine_rejected", { machine: name, reason, link: `${env.WEB_URL}/vendor/machines/${id}` });
  return updated;
}

// ---------------------------------------------------------------------------
// SEARCH HELPERS
// ---------------------------------------------------------------------------

/** "HH-1001" → 1 ; "1001" → 1 ; anything else → null */
function parseBookingNumber(q: string) {
  const m = q.trim().toUpperCase().match(/^(?:HH-)?(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]) - 1000;
  return n > 0 ? n : null;
}

export function adminBookingWhere(q?: string, status?: string): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};
  if (status) where.status = status as Prisma.BookingWhereInput["status"];
  if (q) {
    const n = parseBookingNumber(q);
    const digits = q.replace(/\D/g, "");
    where.OR = [
      ...(n ? [{ bookingNumber: n }] : []),
      ...(digits.length >= 4 ? [{ renter: { phone: { contains: digits } } }, { vendor: { user: { phone: { contains: digits } } } }] : []),
      { renter: { name: { contains: q, mode: "insensitive" } } },
      { vendor: { businessName: { contains: q, mode: "insensitive" } } },
    ];
  }
  return where;
}
