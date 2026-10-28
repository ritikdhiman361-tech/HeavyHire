import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";

/** One review per completed booking. Also refreshes the machine's average rating. */
export async function createReview(renterId: string, bookingId: string, rating: number, comment?: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, renterId } });
  if (!booking) throw ApiError.notFound("Booking");
  if (booking.status !== "COMPLETED") throw ApiError.badRequest("You can review only after the job is done");

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: { bookingId, renterId, machineId: booking.machineId, vendorId: booking.vendorId, rating, comment },
    });
    const stats = await tx.review.aggregate({
      where: { machineId: booking.machineId },
      _avg: { rating: true },
      _count: true,
    });
    await tx.machine.update({
      where: { id: booking.machineId },
      data: { ratingAvg: Math.round((stats._avg.rating ?? 0) * 10) / 10, ratingCount: stats._count },
    });
    return review;
  });
}

export async function listMachineReviews(machineId: string, skip: number, take: number) {
  const where = { machineId };
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, rating: true, comment: true, createdAt: true, renter: { select: { name: true } } },
    }),
    prisma.review.count({ where }),
  ]);
  return {
    items: items.map((r) => ({ ...r, renter: { name: r.renter.name ?? "Customer" } })),
    total,
  };
}
