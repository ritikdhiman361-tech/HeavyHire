import { Router } from "express";
import rateLimit from "express-rate-limit";
import { refreshSchema, sendOtpSchema, verifyOtpSchema } from "@heavyhire/shared";
import { parse } from "../../utils/validate";
import { ok } from "../../utils/respond";
import { publicUser } from "../users/users.service";
import * as auth from "./auth.service";

export const authRouter = Router();

// Extra protection against bots: max 20 auth requests per IP every 15 minutes.
authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests, please wait a bit." } },
  }),
);

authRouter.post("/otp/send", async (req, res) => {
  const { phone } = parse(sendOtpSchema, req.body);
  ok(res, await auth.sendOtp(phone));
});

authRouter.post("/otp/verify", async (req, res) => {
  const { phone, code } = parse(verifyOtpSchema, req.body);
  const result = await auth.verifyOtp(phone, code);
  ok(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    isNew: result.isNew,
    user: await publicUser(result.user.id),
  });
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = parse(refreshSchema, req.body);
  ok(res, await auth.refresh(refreshToken));
});

authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = parse(refreshSchema, req.body);
  await auth.logout(refreshToken);
  ok(res, { loggedOut: true });
});
