import type { Prisma, Vendor } from "@prisma/client";
import type { z } from "zod";
import { PAYOUT_MISSING, type machineSchema, type vendorUpdateSchema } from "@heavyhire/shared";
import { prisma } from "../../lib/prisma";
import { isValidDocumentKey } from "../../lib/storage";
import { ApiError } from "../../utils/ApiError";
import { istStartOfDay, istStartOfMonth } from "../../utils/time";

type VendorInput = z.output<typeof vendorUpdateSchema>;
type MachineInput = z.output<typeof machineSchema>;

// ---------------------------------------------------------------------------
// PROFILE
// ---------------------------------------------------------------------------

/** Hides most of the bank account number: 1234567890 → ******7890 */
const mask = (v: string | null) => (v ? `${"*".repeat(Math.max(v.length - 4, 0))}${v.slice(-4)}` : null);

export function vendorProfileView(v: Vendor) {
  return {
    id: v.id,
    businessName: v.businessName,
    city: v.city,
    area: v.address,
    gstin: v.gstin,
    idDocType: v.idDocType,
    hasIdDoc: Boolean(v.idDocKey),
    upiId: v.upiId,
    bankAccountName: v.bankAccountName,
    bankAccountNumber: mask(v.bankAccountNumber),
    bankIfsc: v.bankIfsc,
    status: v.status,
    rejectionReason: v.rejectionReason,
    approvedAt: v.approvedAt,
  };
}

/**
 * Creates the vendor profile, or updates it.
 * Changing ID proof or payout details sends the account back for approval,
 * so nobody can quietly redirect a vendor's money.
 */
export async function saveVendorProfile(userId: string, input: VendorInput) {
  const existing = await prisma.vendor.findUnique({ where: { userId } });

  // Empty ID / account number on an edit means "keep what's saved".
  const idDocKey = input.idDocKey ?? existing?.idDocKey;
  if (!idDocKey) throw ApiError.badRequest("Upload your ID document", "ID_REQUIRED");
  if (input.idDocKey && !isValidDocumentKey(input.idDocKey)) throw ApiError.badRequest("Please upload your ID document again");
  const bankAccountNumber = input.bankAccountNumber ?? (input.bankIfsc ? (existing?.bankAccountNumber ?? null) : null);

  const data = {
    businessName: input.businessName,
    address: input.area,
    gstin: input.gstin ?? null,
    idDocType: input.idDocType,
    idDocKey,
    upiId: input.upiId ?? null,
    bankAccountName: input.bankAccountName ?? null,
    bankAccountNumber,
    bankIfsc: input.bankIfsc ?? null,
  };
  if (!data.upiId && !(data.bankAccountNumber && data.bankIfsc && data.bankAccountName)) {
    throw ApiError.badRequest(PAYOUT_MISSING, "PAYOUT_REQUIRED");
  }

  if (!existing) {
    const vendor = await prisma.vendor.create({ data: { userId, ...data } });
    return vendorProfileView(vendor);
  }

  const sensitiveChanged =
    existing.idDocKey !== data.idDocKey ||
    existing.upiId !== data.upiId ||
    existing.bankAccountNumber !== data.bankAccountNumber ||
    existing.bankIfsc !== data.bankIfsc;
  const backToReview = existing.status === "REJECTED" || sensitiveChanged;

  const vendor = await prisma.vendor.update({
    where: { id: existing.id },
    data: { ...data, ...(backToReview ? { status: "PENDING", rejectionReason: null } : {}) },
  });
  return vendorProfileView(vendor);
}

export async function getDashboard(vendorId: string) {
  const now = new Date();
  const todayStart = istStartOfDay(now);
  const todayEnd = new Date(todayStart.getTime() + 24 * 3_600_000);

  const [newRequests, todayJobs, ongoing, monthEarnings, pendingPayout, machines] = await Promise.all([
    prisma.booking.count({ where: { vendorId, status: "REQUESTED" } }),
    prisma.booking.count({
      where: { vendorId, status: { in: ["CONFIRMED", "ON_THE_WAY", "WORKING"] }, startAt: { lt: todayEnd }, endAt: { gt: todayStart } },
    }),
    prisma.booking.count({ where: { vendorId, status: { in: ["ON_THE_WAY", "WORKING"] } } }),
    prisma.booking.aggregate({
      where: { vendorId, status: "COMPLETED", updatedAt: { gte: istStartOfMonth(now) } },
      _sum: { vendorAmount: true },
    }),
    prisma.payout.aggregate({ where: { vendorId, status: "PENDING" }, _sum: { amount: true } }),
    prisma.machine.groupBy({ by: ["status"], where: { vendorId }, _count: true }),
  ]);

  return {
    newRequests,
    todayJobs,
    ongoing,
    monthEarnings: monthEarnings._sum.vendorAmount ?? 0,
    pendingPayout: pendingPayout._sum.amount ?? 0,
    machines: Object.fromEntries(machines.map((m) => [m.status, m._count])),
  };
}

// ---------------------------------------------------------------------------
// MACHINES
// ---------------------------------------------------------------------------

const vendorMachineInclude = {
  category: { select: { id: true, slug: true, nameEn: true, nameHi: true } },
  photos: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, publicId: true } },
  blocks: { where: { endAt: { gt: new Date(0) } }, orderBy: { startAt: "asc" } },
} satisfies Prisma.MachineInclude;

export async function listVendorMachines(vendorId: string) {
  return prisma.machine.findMany({
    where: { vendorId },
    include: { ...vendorMachineInclude, blocks: false, _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getVendorMachine(vendorId: string, machineId: string) {
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, vendorId },
    include: { ...vendorMachineInclude, blocks: { where: { endAt: { gt: new Date() } }, orderBy: { startAt: "asc" } } },
  });
  if (!machine) throw ApiError.notFound("Machine");
  return machine;
}

function machineData(input: MachineInput) {
  if (!isValidDocumentKey(input.rcDocKey)) throw ApiError.badRequest("Please upload the RC again");
  return {
    categoryId: input.categoryId,
    brand: input.brand,
    model: input.model,
    year: input.year,
    registrationNo: input.registrationNo ?? null,
    capacity: input.capacity ?? null,
    description: input.description ?? null,
    rcDocKey: input.rcDocKey,
    area: input.area ?? null,
    lat: input.lat,
    lng: input.lng,
    serviceRadiusKm: input.serviceRadiusKm,
    pricePerHour: input.pricePerHour || null,
    pricePerDay: input.pricePerDay || null,
    minHours: input.minHours,
    transportCharge: input.transportCharge,
    fuelIncluded: input.fuelIncluded,
  };
}

async function assertCategory(categoryId: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, isActive: true } });
  if (!category) throw ApiError.badRequest("Choose a valid machine type");
}

export async function createMachine(vendorId: string, input: MachineInput) {
  await assertCategory(input.categoryId);
  return prisma.machine.create({
    data: {
      vendorId,
      ...machineData(input),
      photos: { create: input.photos.map((p, i) => ({ url: p.url, publicId: p.publicId, sortOrder: i })) },
    },
    include: vendorMachineInclude,
  });
}

/** Changing what the machine IS (type, model, RC...) needs admin approval again. Prices don't. */
export async function updateMachine(vendorId: string, machineId: string, input: MachineInput) {
  const existing = await getVendorMachine(vendorId, machineId);
  await assertCategory(input.categoryId);
  const data = machineData(input);

  const identityChanged =
    existing.categoryId !== data.categoryId ||
    existing.brand !== data.brand ||
    existing.model !== data.model ||
    existing.year !== data.year ||
    existing.registrationNo !== data.registrationNo ||
    existing.rcDocKey !== data.rcDocKey;
  const needsReview = identityChanged || existing.status === "REJECTED";

  return prisma.$transaction(async (tx) => {
    await tx.machinePhoto.deleteMany({ where: { machineId } });
    return tx.machine.update({
      where: { id: machineId },
      data: {
        ...data,
        ...(needsReview ? { status: "PENDING", rejectionReason: null } : {}),
        photos: { create: input.photos.map((p, i) => ({ url: p.url, publicId: p.publicId, sortOrder: i })) },
      },
      include: vendorMachineInclude,
    });
  });
}

export async function setPaused(vendorId: string, machineId: string, paused: boolean) {
  const machine = await getVendorMachine(vendorId, machineId);
  const from = paused ? "APPROVED" : "PAUSED";
  if (machine.status !== from) {
    throw ApiError.badRequest(paused ? "Only live machines can be paused" : "This machine is not paused");
  }
  return prisma.machine.update({ where: { id: machineId }, data: { status: paused ? "PAUSED" : "APPROVED" } });
}

export async function addBlock(vendorId: string, machineId: string, block: { startAt: Date; endAt: Date; reason?: string }) {
  await getVendorMachine(vendorId, machineId);
  return prisma.machineBlock.create({ data: { machineId, ...block } });
}

export async function removeBlock(vendorId: string, machineId: string, blockId: string) {
  await getVendorMachine(vendorId, machineId);
  const { count } = await prisma.machineBlock.deleteMany({ where: { id: blockId, machineId } });
  if (!count) throw ApiError.notFound("Blocked date");
}

// ---------------------------------------------------------------------------
// BOOKINGS & PAYOUTS
// ---------------------------------------------------------------------------

export type VendorBookingFilter = "new" | "upcoming" | "ongoing" | "past";

export function vendorBookingWhere(vendorId: string, filter?: VendorBookingFilter): Prisma.BookingWhereInput {
  switch (filter) {
    case "new":
      return { vendorId, status: "REQUESTED" };
    case "upcoming":
      return { vendorId, status: "CONFIRMED" };
    case "ongoing":
      return { vendorId, status: { in: ["ON_THE_WAY", "WORKING"] } };
    case "past":
      return { vendorId, status: { in: ["COMPLETED", "REJECTED", "EXPIRED", "CANCELLED"] } };
    default:
      return { vendorId, status: { not: "PENDING_PAYMENT" } };
  }
}

export async function listPayouts(vendorId: string, skip: number, take: number) {
  const [items, total, pending, paid] = await Promise.all([
    prisma.payout.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { booking: { select: { bookingNumber: true, totalAmount: true, commissionAmount: true, payAtSiteAmount: true } } },
    }),
    prisma.payout.count({ where: { vendorId } }),
    prisma.payout.aggregate({ where: { vendorId, status: "PENDING" }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { vendorId, status: "PAID" }, _sum: { amount: true } }),
  ]);
  return { items, total, pendingAmount: pending._sum.amount ?? 0, paidAmount: paid._sum.amount ?? 0 };
}
