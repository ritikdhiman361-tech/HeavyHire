import { ACTIVE_BOOKING_STATUSES, type PricingUnit } from "@heavyhire/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getSettings } from "../../lib/settings";
import { ApiError } from "../../utils/ApiError";
import { boundingBox, distanceKm } from "../../utils/geo";
import { istDayStart } from "../../utils/time";
import { getBookableMachine, priceFor } from "../bookings/bookings.service";

/** Only machines that are approved, from approved and unblocked vendors, show up publicly. */
const LIVE: Prisma.MachineWhereInput = {
  status: "APPROVED",
  vendor: { status: "APPROVED", user: { isBlocked: false } },
};

const cardSelect = {
  id: true,
  brand: true,
  model: true,
  year: true,
  capacity: true,
  area: true,
  city: true,
  lat: true,
  lng: true,
  serviceRadiusKm: true,
  pricePerHour: true,
  pricePerDay: true,
  minHours: true,
  transportCharge: true,
  withOperator: true,
  fuelIncluded: true,
  ratingAvg: true,
  ratingCount: true,
  category: { select: { slug: true, nameEn: true, nameHi: true } },
  photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
  vendor: { select: { businessName: true } },
} satisfies Prisma.MachineSelect;

type Card = Prisma.MachineGetPayload<{ select: typeof cardSelect }>;

function toCard(m: Card, distance: number | null) {
  const { photos, lat: _lat, lng: _lng, ...rest } = m;
  return { ...rest, photo: photos[0]?.url ?? null, distanceKm: distance == null ? null : Math.round(distance * 10) / 10 };
}

interface SearchInput {
  category?: string;
  lat?: number;
  lng?: number;
  date?: string;
  unit?: PricingUnit;
  maxPrice?: number;
  minRating?: number;
  sort: "nearest" | "price" | "rating";
  page: number;
  limit: number;
}

/**
 * Finds machines for the search page.
 * For a city-sized marketplace it's fine to load the matching machines and
 * sort by distance in code. (Move to PostGIS when there are 10,000+ machines.)
 */
export async function searchMachines(q: SearchInput) {
  const where: Prisma.MachineWhereInput = { ...LIVE };
  if (q.category) where.category = { slug: q.category };
  if (q.minRating) where.ratingAvg = { gte: q.minRating };

  const unit = q.unit ?? "HOUR";
  const priceField = unit === "HOUR" ? "pricePerHour" : "pricePerDay";
  where[priceField] = q.maxPrice ? { not: null, lte: q.maxPrice } : { not: null };

  // Near a site: machines can travel up to 200 km in the widest case.
  const hasPoint = q.lat != null && q.lng != null;
  if (hasPoint) {
    const box = boundingBox(q.lat!, q.lng!, 200);
    where.lat = { gte: box.minLat, lte: box.maxLat };
    where.lng = { gte: box.minLng, lte: box.maxLng };
  }

  // Free on that date: no active booking or vendor block during the day.
  if (q.date) {
    const dayStart = istDayStart(q.date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
    const overlaps = { startAt: { lt: dayEnd }, endAt: { gt: dayStart } };
    where.bookings = { none: { ...overlaps, status: { in: ACTIVE_BOOKING_STATUSES } } };
    where.blocks = { none: overlaps };
  }

  const rows = await prisma.machine.findMany({ where, select: cardSelect, take: 500 });

  let results = rows.map((m) => ({ m, d: hasPoint ? distanceKm(q.lat!, q.lng!, m.lat, m.lng) : null }));
  if (hasPoint) results = results.filter(({ m, d }) => d! <= m.serviceRadiusKm);

  const price = (m: Card) => (unit === "HOUR" ? m.pricePerHour : m.pricePerDay) ?? Infinity;
  results.sort((a, b) => {
    if (q.sort === "price") return price(a.m) - price(b.m);
    if (q.sort === "rating") return b.m.ratingAvg - a.m.ratingAvg || b.m.ratingCount - a.m.ratingCount;
    return (a.d ?? 0) - (b.d ?? 0) || b.m.ratingAvg - a.m.ratingAvg;
  });

  const start = (q.page - 1) * q.limit;
  return {
    items: results.slice(start, start + q.limit).map(({ m, d }) => toCard(m, d)),
    total: results.length,
  };
}

/** Everything for the machine details page. */
export async function getMachine(id: string) {
  const machine = await prisma.machine.findFirst({
    where: { id, ...LIVE },
    select: {
      ...cardSelect,
      description: true,
      registrationNo: true,
      photos: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      vendor: { select: { businessName: true, createdAt: true } },
    },
  });
  if (!machine) throw ApiError.notFound("Machine");
  const { lat, lng, registrationNo, ...rest } = machine;
  return {
    ...rest,
    // Rough location only (~1 km), the exact parking spot stays private.
    approxLat: Math.round(lat * 100) / 100,
    approxLng: Math.round(lng * 100) / 100,
    isRegistered: Boolean(registrationNo),
    photos: machine.photos.map((p) => p.url),
  };
}

/** Busy time ranges in a month, so the calendar can grey out dates. */
export async function getAvailability(id: string, month: string) {
  await getBookableMachine(id);
  const from = istDayStart(`${month}-01`);
  const to = new Date(from);
  to.setUTCMonth(to.getUTCMonth() + 1);
  const overlaps = { machineId: id, startAt: { lt: to }, endAt: { gt: from } };

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { ...overlaps, status: { in: ACTIVE_BOOKING_STATUSES } },
      select: { startAt: true, endAt: true },
    }),
    prisma.machineBlock.findMany({ where: overlaps, select: { startAt: true, endAt: true } }),
  ]);
  return { month, busy: [...bookings, ...blocks].sort((a, b) => a.startAt.getTime() - b.startAt.getTime()) };
}

export async function getPricePreview(id: string, unit: PricingUnit, quantity: number, plan: "FULL" | "ADVANCE") {
  const [machine, settings] = await Promise.all([getBookableMachine(id), getSettings()]);
  return priceFor(machine, settings, unit, quantity, plan);
}
