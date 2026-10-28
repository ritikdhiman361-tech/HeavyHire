import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { LIMITS } from "@heavyhire/shared";
import { prisma } from "../../lib/prisma";
import { sendOtpSms } from "../../lib/msg91";
import { env, features, isProd } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { addMinutes } from "../../utils/time";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_DAYS = 30;
const MAX_OTPS_PER_HOUR = 5;

/** We never store the OTP itself, only this fingerprint of it. */
function hashOtp(phone: string, code: string) {
  return crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update(`${phone}:${code}`).digest("hex");
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ---------------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------------

export async function sendOtp(phone: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.otpCode.count({ where: { phone, createdAt: { gte: oneHourAgo } } });
  if (recent >= MAX_OTPS_PER_HOUR) {
    throw new ApiError(429, "TOO_MANY_OTPS", "Too many OTP requests. Please try again in an hour.");
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  await prisma.otpCode.create({
    data: { phone, codeHash: hashOtp(phone, code), expiresAt: addMinutes(new Date(), LIMITS.otpTtlMinutes) },
  });
  await sendOtpSms(phone, code);

  // In dev mode (no SMS provider), return the code so you can log in easily.
  return { sent: true, ...(!features.sms && !isProd ? { devCode: code } : {}) };
}

export async function verifyOtp(phone: string, code: string) {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw ApiError.badRequest("OTP expired. Please request a new one.", "OTP_EXPIRED");
  if (otp.attempts >= LIMITS.otpMaxAttempts) {
    throw ApiError.badRequest("Too many wrong tries. Please request a new OTP.", "OTP_LOCKED");
  }

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashOtp(phone, code), "hex");
  if (!crypto.timingSafeEqual(expected, actual)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest("Wrong OTP. Please check and try again.", "OTP_INVALID");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  // First login creates the account.
  const existing = await prisma.user.findUnique({ where: { phone } });
  const user = existing ?? (await prisma.user.create({ data: { phone } }));
  if (user.isBlocked) throw ApiError.forbidden("Your account is blocked. Please contact support.");

  const tokens = await issueTokens(user);
  return { ...tokens, isNew: !existing, user };
}

// ---------------------------------------------------------------------------
// TOKENS
// ---------------------------------------------------------------------------

export interface AccessTokenPayload {
  sub: string; // user id
  role: User["role"];
}

async function issueTokens(user: User) {
  const accessToken = jwt.sign({ sub: user.id, role: user.role } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

  const refreshToken = crypto.randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new ApiError(401, "TOKEN_INVALID", "Session expired. Please log in again.");
  }
}

/** Swaps a refresh token for a fresh pair (the old one stops working). */
export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new ApiError(401, "REFRESH_INVALID", "Session expired. Please log in again.");
  }
  if (stored.user.isBlocked) throw ApiError.forbidden("Your account is blocked. Please contact support.");

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return issueTokens(stored.user);
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
