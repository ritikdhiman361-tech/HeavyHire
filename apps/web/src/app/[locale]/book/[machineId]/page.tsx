"use client";

import { use, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LIMITS } from "@heavyhire/shared";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { classNames, formatRupees, todayIst } from "@/lib/format";
import type { Place } from "@/lib/location";
import { payWithRazorpay, PaymentCancelled } from "@/lib/razorpay";
import type { MachineDetail, PriceBreakdown } from "@/lib/types";
import { PhoneLogin } from "@/components/forms/PhoneLogin";
import { PlaceSearch } from "@/components/forms/PlaceSearch";
import { PriceRows } from "@/components/booking/PriceRows";
import { Button } from "@/components/ui/Button";
import { Alert, Card, EmptyState } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

// Booking in 3 steps:  1. When?  →  2. Where?  →  3. Pay

const START_TIMES = Array.from({ length: 15 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`); // 06:00–20:00

export default function BookPage({ params }: { params: Promise<{ machineId: string }> }) {
  const { machineId } = use(params);
  const t = useTranslations("book");
  const c = useTranslations("common");
  const tl = useTranslations("location");
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  // Keeps the login box open until it's fully done (incl. "what's your name?").
  const [loggingIn, setLoggingIn] = useState(false);

  const machine = useQuery({ queryKey: ["machine", machineId], queryFn: () => api.get<MachineDetail>(`/machines/${machineId}`) });
  const m = machine.data;

  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState<"HOUR" | "DAY">("HOUR");
  const [date, setDate] = useState(todayIst(1));
  const [time, setTime] = useState("09:00");
  const [quantity, setQuantity] = useState(8);
  const [site, setSite] = useState<Place | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<"FULL" | "ADVANCE">("FULL");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) setLoggingIn(true);
  }, [authLoading, user]);

  // Pick sensible defaults once the machine has loaded.
  useEffect(() => {
    if (!m) return;
    if (!m.pricePerHour) setUnit("DAY");
    setQuantity(m.pricePerHour ? Math.max(m.minHours, 8) : 1);
  }, [m]);

  const minQty = unit === "HOUR" ? (m?.minHours ?? 1) : 1;
  const maxQty = unit === "HOUR" ? LIMITS.maxHoursPerBooking : LIMITS.maxDaysPerBooking;

  // Live price (asked from the API so it always matches what will be charged).
  const price = useQuery({
    queryKey: ["price", machineId, unit, quantity],
    enabled: Boolean(m),
    queryFn: () => api.post<PriceBreakdown>(`/machines/${machineId}/price`, { unit, quantity, paymentPlan: "ADVANCE" }),
  });

  if (machine.isLoading) return <PageSpinner />;
  if (!m) return <EmptyState title={c("somethingWrong")} />;

  const p = price.data;
  const payNow = plan === "FULL" ? p?.totalAmount : p?.payNowAmount;

  async function pay() {
    if (!m || !site) return;
    setPaying(true);
    setError("");
    try {
      const created = await api.post<{
        booking: { id: string; bookingNumber: string };
        payment: { razorpayOrderId: string; amount: number; keyId: string };
      }>("/bookings", {
        machineId,
        unit,
        quantity,
        startAt: `${date}T${time}:00+05:30`,
        siteAddress: address,
        siteLat: site.lat,
        siteLng: site.lng,
        notes: notes || undefined,
        paymentPlan: plan,
      });
      const result = await payWithRazorpay({
        keyId: created.payment.keyId,
        orderId: created.payment.razorpayOrderId,
        amount: created.payment.amount,
        description: `${created.booking.bookingNumber} · ${m.brand} ${m.model}`,
        phone: user?.phone,
        name: user?.name ?? undefined,
      });
      await api.post(`/bookings/${created.booking.id}/payments/verify`, result);
      if (created.payment.keyId === "mock") toast(t("testPayment"));
      router.replace(`/bookings/${created.booking.id}?paid=1`);
    } catch (err) {
      if (err instanceof PaymentCancelled) toast(t("paymentCancelled"), "error");
      else setError((err as ApiError).message);
      setPaying(false);
    }
  }

  const steps = [t("stepWhen"), t("stepWhere"), t("stepPay")];

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-24">
      <div>
        <p className="text-sm text-stone-500">{t("step", { n: step })}</p>
        <h1 className="text-xl font-extrabold">{t("title", { machine: `${m.brand} ${m.model}` })}</h1>
        <div className="mt-3 flex gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={classNames("h-1.5 rounded-full", i < step ? "bg-brand-500" : "bg-stone-200")} />
              <p className={classNames("mt-1 text-xs", i + 1 === step ? "font-bold" : "text-stone-500")}>{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- Step 1: When? ---------------- */}
      {step === 1 && (
        <Card className="space-y-4">
          {m.pricePerHour && m.pricePerDay && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
              {(["HOUR", "DAY"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => {
                    setUnit(u);
                    setQuantity(u === "HOUR" ? Math.max(m.minHours, 8) : 1);
                  }}
                  className={classNames("rounded-lg py-2.5 font-semibold", unit === u ? "bg-white shadow" : "text-stone-600")}
                >
                  {u === "HOUR" ? t("byHour") : t("byDay")}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("date")}>
              <Input type="date" min={todayIst()} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t("time")}>
              <Select value={time} onChange={(e) => setTime(e.target.value)}>
                {START_TIMES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={unit === "HOUR" ? t("howManyHours") : t("howManyDays")} hint={unit === "HOUR" ? t("minHours", { count: m.minHours }) : undefined}>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => setQuantity((q) => Math.max(minQty, q - 1))} disabled={quantity <= minQty} aria-label="Less">
                −
              </Button>
              <span className="flex-1 text-center text-2xl font-extrabold">
                {unit === "HOUR" ? c("hours", { count: quantity }) : c("days", { count: quantity })}
              </span>
              <Button type="button" variant="outline" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} aria-label="More">
                +
              </Button>
            </div>
          </Field>
        </Card>
      )}

      {/* ---------------- Step 2: Where? ---------------- */}
      {step === 2 && (
        <Card className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-stone-700">{t("siteLocation")}</p>
            {site ? (
              <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 text-green-900">
                <span>📍 {site.label}</span>
                <button className="text-sm font-semibold underline" onClick={() => setSite(null)}>
                  {c("edit")}
                </button>
              </div>
            ) : (
              <PlaceSearch
                onPick={(pl) => {
                  setSite(pl);
                  if (!address) setAddress(pl.label === tl("current") ? "" : `${pl.label}, Bengaluru`);
                }}
              />
            )}
          </div>
          <Field label={t("siteAddress")} hint={t("siteAddressHint")}>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </Field>
          <Field label={`${t("notes")} (${c("optional")})`}>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesHint")} />
          </Field>
        </Card>
      )}

      {/* ---------------- Step 3: Pay ---------------- */}
      {step === 3 && p && (
        <>
          <Card>
            <h2 className="mb-3 font-bold">{t("summary")}</h2>
            <PriceRows unit={unit} {...p} />
          </Card>
          <Card className="space-y-3">
            <h2 className="font-bold">{t("howToPay")}</h2>
            {(
              [
                ["FULL", t("payFull"), t("payFullHint")],
                ["ADVANCE", t("payAdvance"), t("payAdvanceHint", { now: formatRupees(p.payNowAmount), later: formatRupees(p.payAtSiteAmount) })],
              ] as const
            ).map(([value, title, hint]) => (
              <label
                key={value}
                className={classNames(
                  "flex cursor-pointer gap-3 rounded-xl border-2 p-3",
                  plan === value ? "border-brand-500 bg-brand-50" : "border-stone-200",
                )}
              >
                <input type="radio" name="plan" className="mt-1 accent-brand-500" checked={plan === value} onChange={() => setPlan(value)} />
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="text-sm text-stone-600">{hint}</span>
                </span>
              </label>
            ))}
          </Card>
          <Alert tone="green">💸 {t("refundNote")}</Alert>
          {loggingIn && (
            <Card>
              <p className="mb-3 font-semibold">{t("loginToPay")}</p>
              <PhoneLogin onDone={() => setLoggingIn(false)} />
            </Card>
          )}
          {error && <Alert tone="red">{error}</Alert>}
        </>
      )}

      {/* Bottom bar: price + next/pay button */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-stone-200 bg-white p-3 md:bottom-0">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={paying}>
              ←
            </Button>
          )}
          <div className="flex-1">
            <p className="text-xs text-stone-500">{t("total")}</p>
            <p className="text-lg font-extrabold">{p ? formatRupees(p.totalAmount) : "…"}</p>
          </div>
          {step < 3 ? (
            <Button
              size="lg"
              onClick={() => setStep(step + 1)}
              disabled={!p || (step === 2 && (!site || address.trim().length < 5))}
            >
              {c("next")} →
            </Button>
          ) : (
            <Button size="lg" onClick={pay} loading={paying} disabled={!user || loggingIn || !payNow}>
              {paying ? t("paying") : t("payNow", { amount: formatRupees(payNow ?? 0) })}
            </Button>
          )}
        </div>
        {step === 2 && !site && <p className="mx-auto mt-1 max-w-lg text-xs text-stone-500">{t("locationNeeded")}</p>}
      </div>
      {price.isError && step === 1 && <Alert tone="red">{(price.error as Error).message}</Alert>}
    </div>
  );
}
