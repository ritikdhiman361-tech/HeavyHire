import { Router } from "express";
import { z } from "zod";
import { priceQuerySchema, searchSchema } from "@heavyhire/shared";
import { getPagination } from "../../utils/pagination";
import { ok, okList } from "../../utils/respond";
import { parse } from "../../utils/validate";
import { listMachineReviews } from "../reviews/reviews.service";
import { getAvailability, getMachine, getPricePreview, searchMachines } from "./machines.service";

// Public: no login needed to browse.
export const machinesRouter = Router();

machinesRouter.get("/search", async (req, res) => {
  const q = parse(searchSchema, req.query);
  const { items, total } = await searchMachines(q);
  okList(res, items, { page: q.page, limit: q.limit, total });
});

machinesRouter.get("/:id", async (req, res) => {
  ok(res, await getMachine(req.params.id));
});

const monthSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM")
    .default(() => new Date().toISOString().slice(0, 7)),
});

machinesRouter.get("/:id/availability", async (req, res) => {
  const { month } = parse(monthSchema, req.query);
  ok(res, await getAvailability(req.params.id, month));
});

machinesRouter.get("/:id/reviews", async (req, res) => {
  const { page, limit, skip, take } = getPagination(req.query);
  const { items, total } = await listMachineReviews(req.params.id, skip, take);
  okList(res, items, { page, limit, total });
});

machinesRouter.post("/:id/price", async (req, res) => {
  const { unit, quantity, paymentPlan } = parse(priceQuerySchema, req.body);
  ok(res, await getPricePreview(req.params.id, unit, quantity, paymentPlan));
});
