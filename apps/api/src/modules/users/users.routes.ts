import { Router } from "express";
import { updateMeSchema } from "@heavyhire/shared";
import { requireUser } from "../../middleware/auth";
import { parse } from "../../utils/validate";
import { ok } from "../../utils/respond";
import { publicUser, updateMe } from "./users.service";

export const usersRouter = Router();

usersRouter.get("/", requireUser, async (req, res) => {
  ok(res, await publicUser(req.user!.id));
});

usersRouter.patch("/", requireUser, async (req, res) => {
  ok(res, await updateMe(req.user!.id, parse(updateMeSchema, req.body)));
});
