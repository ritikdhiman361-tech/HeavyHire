import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";

/** The user's own profile, safe to send to the app. */
export async function publicUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      name: true,
      email: true,
      language: true,
      role: true,
      createdAt: true,
      vendor: { select: { id: true, businessName: true, status: true, rejectionReason: true } },
    },
  });
  if (!user) throw ApiError.notFound("User");
  return user;
}

export async function updateMe(userId: string, data: { name?: string; email?: string; language?: "EN" | "HI" }) {
  await prisma.user.update({ where: { id: userId }, data });
  return publicUser(userId);
}
