import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { ok } from "../../utils/respond";

export const categoriesRouter = Router();

/** Machine types for the home screen. */
categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { id: true, slug: true, nameEn: true, nameHi: true, iconUrl: true },
  });
  ok(res, categories);
});
