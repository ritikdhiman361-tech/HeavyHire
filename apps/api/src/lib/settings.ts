import { prisma } from "./prisma";

/** Platform settings (commission %, GST %...). Creates the single row on first use. */
export async function getSettings() {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
