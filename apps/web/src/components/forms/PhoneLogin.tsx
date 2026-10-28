"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { phoneSchema } from "@heavyhire/shared";
import { api, ApiError, type Tokens } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";

/**
 * Phone → OTP → (name, first time only) → done.
 * Used on the login page AND inside the booking flow.
 */
export function PhoneLogin({ onDone }: { onDone: (user: Me) => void }) {
  const t = useTranslations("login");
  const { signIn } = useAuth();
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<Me>();

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) return setError(parsed.error.issues[0]!.message);
    setBusy(true);
    setError("");
    try {
      const res = await api.post<{ devCode?: string }>("/auth/otp/send", { phone });
      setDevCode(res.devCode);
      setStep("otp");
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.post<Tokens & { isNew: boolean; user: Me }>("/auth/otp/verify", { phone, code });
      signIn({ accessToken: res.accessToken, refreshToken: res.refreshToken }, res.user);
      if (!res.user.name) {
        setUser(res.user);
        setStep("name");
      } else {
        onDone(res.user);
      }
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return onDone(user!);
    setBusy(true);
    try {
      onDone(await api.patch<Me>("/me", { name }));
    } catch {
      onDone(user!);
    }
  }

  if (step === "name") {
    return (
      <form onSubmit={saveName} className="space-y-4">
        <Field label={t("nameTitle")}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} autoComplete="name" />
        </Field>
        <Button type="submit" size="lg" full loading={busy}>
          {t("continue")}
        </Button>
      </form>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={verify} className="space-y-4">
        <p className="text-sm text-stone-600">{t("otpSent", { phone: `+91 ${phone.replace(/\D/g, "").slice(-10)}` })}</p>
        {devCode && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{t("devCode", { code: devCode })}</p>}
        <Field label={t("otp")} error={error}>
          <Input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-[0.5em]"
          />
        </Field>
        <Button type="submit" size="lg" full loading={busy} disabled={code.length !== 6}>
          {busy ? t("verifying") : t("verify")}
        </Button>
        <div className="flex justify-between text-sm">
          <button type="button" className="text-stone-600 underline" onClick={() => setStep("phone")}>
            {t("changeNumber")}
          </button>
          <button type="button" className="font-semibold text-brand-700" onClick={() => sendOtp()}>
            {t("resend")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} className="space-y-4">
      <Field label={t("phone")} error={error}>
        <div className="flex">
          <span className="flex items-center rounded-l-xl border border-r-0 border-stone-300 bg-stone-100 px-3 font-medium">+91</span>
          <Input
            autoFocus
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-l-none text-lg"
          />
        </div>
      </Field>
      <Button type="submit" size="lg" full loading={busy}>
        {busy ? t("sending") : t("sendOtp")}
      </Button>
    </form>
  );
}
