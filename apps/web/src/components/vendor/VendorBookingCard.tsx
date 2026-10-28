"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { VENDOR_STATUS_FLOW } from "@heavyhire/shared";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatRupees } from "@/lib/format";
import type { VendorBooking } from "@/lib/types";
import { StatusBadge } from "../booking/Status";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Field";
import { useToast } from "../ui/Toast";

/** One booking for the owner, with the ONE button they need right now. */
export function VendorBookingCard({ booking: b }: { booking: VendorBooking }) {
  const t = useTranslations("vendor.bookings");
  const c = useTranslations("common");
  const locale = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"idle" | "accept" | "reject">("idle");
  const [operatorName, setOperatorName] = useState("");
  const [operatorPhone, setOperatorPhone] = useState("");
  const [reason, setReason] = useState("");

  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => api.post(`/vendor/bookings/${b.id}/${path}`, body ?? {}),
    onSuccess: () => {
      setMode("idle");
      void qc.invalidateQueries({ queryKey: ["vendor-bookings"] });
      void qc.invalidateQueries({ queryKey: ["vendor-dashboard"] });
    },
    onError: (e: ApiError) => toast(e.message, "error"),
  });

  const next = VENDOR_STATUS_FLOW[b.status];
  const qty = b.unit === "HOUR" ? c("hours", { count: b.quantity }) : c("days", { count: b.quantity });
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${b.siteLat},${b.siteLng}`;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{b.machine.name}</p>
          <p className="text-sm text-stone-500">{b.bookingNumber}</p>
        </div>
        <StatusBadge status={b.status} />
      </div>

      <div className="space-y-1 text-sm">
        <p>
          🗓️ <strong>{formatDateTime(b.startAt, locale)}</strong> · {qty}
        </p>
        <p>
          📍 {b.siteAddress}{" "}
          <a href={mapsLink} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">
            Map
          </a>
        </p>
        <p>
          👤 {b.renter.name}
          {b.renter.phone && (
            <a href={`tel:${b.renter.phone}`} className="ml-2 font-semibold text-green-700">
              📞 {b.renter.phone}
            </a>
          )}
        </p>
        {b.notes && <p className="rounded-lg bg-brand-50 px-2 py-1">📝 {b.notes}</p>}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-stone-50 px-3 py-2 text-sm">
        <span className="font-semibold text-green-700">{t("youGet", { amount: formatRupees(b.vendorAmount) })}</span>
        {b.price.payAtSiteAmount > 0 && <span className="font-semibold">{t("collectAtSite", { amount: formatRupees(b.price.payAtSiteAmount) })}</span>}
      </div>

      {/* New request: accept or reject */}
      {b.status === "REQUESTED" && mode === "idle" && (
        <>
          {b.vendorReplyBy && <p className="text-sm font-medium text-red-600">⏰ {t("replyBy", { time: formatDateTime(b.vendorReplyBy, locale) })}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setMode("reject")}>
              {t("reject")}
            </Button>
            <Button onClick={() => setMode("accept")}>{t("accept")}</Button>
          </div>
        </>
      )}
      {mode === "accept" && (
        <div className="space-y-2">
          <Input placeholder={t("operatorName")} value={operatorName} onChange={(e) => setOperatorName(e.target.value)} />
          <Input placeholder={t("operatorPhone")} inputMode="tel" value={operatorPhone} onChange={(e) => setOperatorPhone(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setMode("idle")}>
              {c("back")}
            </Button>
            <Button
              loading={action.isPending}
              onClick={() => action.mutate({ path: "accept", body: { operatorName: operatorName || undefined, operatorPhone: operatorPhone.replace(/\D/g, "").slice(-10) || undefined } })}
            >
              {t("confirmAccept")}
            </Button>
          </div>
        </div>
      )}
      {mode === "reject" && (
        <div className="space-y-2">
          <Input placeholder={t("rejectReason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setMode("idle")}>
              {c("back")}
            </Button>
            <Button variant="danger" loading={action.isPending} disabled={reason.trim().length < 2} onClick={() => action.mutate({ path: "reject", body: { reason } })}>
              {t("reject")}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmed / on the way / working: one big button for the next step */}
      {next && (
        <Button size="lg" full variant="dark" loading={action.isPending} onClick={() => action.mutate({ path: "status", body: { status: next } })}>
          {t(`next.${next as "ON_THE_WAY" | "WORKING" | "COMPLETED"}`)}
        </Button>
      )}
    </Card>
  );
}
