"use client";

import { Suspense, use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatRupees } from "@/lib/format";
import type { RenterBooking } from "@/lib/types";
import { RequireLogin } from "@/components/RequireLogin";
import { PriceRows } from "@/components/booking/PriceRows";
import { StatusBadge, StatusSteps } from "@/components/booking/Status";
import { Button } from "@/components/ui/Button";
import { Alert, Card, EmptyState } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { PageSpinner } from "@/components/ui/Spinner";
import { StarPicker, Stars } from "@/components/ui/Stars";
import { useToast } from "@/components/ui/Toast";

function BookingDetail({ id }: { id: string }) {
  const t = useTranslations("bookings");
  const c = useTranslations("common");
  const locale = useLocale();
  const toast = useToast();
  const qc = useQueryClient();
  const justPaid = useSearchParams().get("paid") === "1";

  const q = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get<RenterBooking>(`/bookings/${id}`),
    // Keep checking while the booking is moving, so status updates appear by themselves.
    refetchInterval: (query) => (["REQUESTED", "CONFIRMED", "ON_THE_WAY", "WORKING"].includes(query.state.data?.status ?? "") ? 20_000 : false),
  });

  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["booking", id] });
  const cancel = useMutation({
    mutationFn: () => api.post<{ refundAmount: number }>(`/bookings/${id}/cancel`, { reason: reason || undefined }),
    onSuccess: (r) => {
      toast(t("cancelled", { amount: formatRupees(r.refundAmount) }));
      setCancelling(false);
      void refresh();
    },
    onError: (e: ApiError) => toast(e.message, "error"),
  });
  const review = useMutation({
    mutationFn: () => api.post(`/bookings/${id}/review`, { rating, comment: comment || undefined }),
    onSuccess: () => {
      toast(t("thanks"));
      void refresh();
    },
    onError: (e: ApiError) => toast(e.message, "error"),
  });

  if (q.isLoading) return <PageSpinner />;
  if (!q.data) return <EmptyState title={c("somethingWrong")} />;
  const b = q.data;
  const qty = b.unit === "HOUR" ? c("hours", { count: b.quantity }) : c("days", { count: b.quantity });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {justPaid && b.status === "REQUESTED" && <Alert tone="green">🎉 {t("paymentSuccess")}</Alert>}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{t("details", { number: b.bookingNumber })}</p>
          <h1 className="text-xl font-extrabold">{b.machine.name}</h1>
        </div>
        <StatusBadge status={b.status} />
      </div>

      <Card>
        <StatusSteps status={b.status} />
        {b.status === "REQUESTED" && b.vendorReplyBy && (
          <p className="mt-3 text-center text-sm text-stone-600">{t("waitingFor", { time: formatDateTime(b.vendorReplyBy, locale) })}</p>
        )}
        {(b.rejectedReason || b.cancelReason) && <p className="mt-2 text-sm text-stone-600">{b.rejectedReason ?? b.cancelReason}</p>}
      </Card>

      <Card className="space-y-3 text-sm">
        <div>
          <p className="text-stone-500">{t("when")}</p>
          <p className="font-semibold">
            {formatDateTime(b.startAt, locale)} · {qty}
          </p>
        </div>
        <div>
          <p className="text-stone-500">{t("where")}</p>
          <p className="font-semibold">{b.siteAddress}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-stone-500">{b.operator?.name ? t("operator") : t("owner")}</p>
            <p className="font-semibold">{b.operator?.name ?? b.vendor.businessName}</p>
            {!b.vendor.phone && <p className="text-xs text-stone-500">{t("contactAfterConfirm")}</p>}
          </div>
          {(b.operator?.phone ?? b.vendor.phone) && (
            <a href={`tel:${b.operator?.phone ?? b.vendor.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-green-600 px-4 font-semibold text-white">
              📞 {c("call")}
            </a>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <PriceRows unit={b.unit} quantity={b.quantity} {...b.price} />
        <div className="space-y-1 border-t border-stone-100 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-600">{t("paid")}</span>
            <span className="font-semibold text-green-700">{formatRupees(b.price.amountPaid)}</span>
          </div>
          {b.price.payAtSiteAmount > 0 && !["REJECTED", "EXPIRED", "CANCELLED"].includes(b.status) && (
            <div className="flex justify-between">
              <span className="text-stone-600">{t("payAtSite")}</span>
              <span className="font-semibold">{formatRupees(b.price.payAtSiteAmount)}</span>
            </div>
          )}
          {b.price.refundedAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-stone-600">{t("refunded")}</span>
              <span className="font-semibold">{formatRupees(b.price.refundedAmount)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Review after the job */}
      {b.canReview && (
        <Card className="space-y-3">
          <h2 className="font-bold">{t("rateTitle")}</h2>
          <StarPicker value={rating} onChange={setRating} />
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("rateComment")} />
          <Button full onClick={() => review.mutate()} loading={review.isPending} disabled={!rating}>
            {t("rateSubmit")}
          </Button>
        </Card>
      )}
      {b.review && (
        <Card>
          <p className="text-sm text-stone-500">{t("yourReview")}</p>
          <Stars value={b.review.rating} />
          {b.review.comment && <p className="mt-1 text-sm">{b.review.comment}</p>}
        </Card>
      )}

      {/* Cancel */}
      {b.canCancel &&
        (cancelling ? (
          <Card className="space-y-3">
            <Field label={t("cancelReason")}>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button variant="outline" full onClick={() => setCancelling(false)}>
                {c("back")}
              </Button>
              <Button variant="danger" full onClick={() => cancel.mutate()} loading={cancel.isPending}>
                {t("cancelConfirm")}
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="ghost" full className="text-red-600" onClick={() => setCancelling(true)}>
            {t("cancel")}
          </Button>
        ))}

      <details className="text-sm">
        <summary className="cursor-pointer text-stone-500">{t("timeline")}</summary>
        <ul className="mt-2 space-y-1">
          {b.events.map((e, i) => (
            <li key={i} className="flex justify-between gap-2 text-stone-600">
              <span>
                <StatusBadge status={e.status} /> {e.note}
              </span>
              <span className="shrink-0">{formatDateTime(e.createdAt, locale)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireLogin>
      <Suspense>
        <BookingDetail id={id} />
      </Suspense>
    </RequireLogin>
  );
}
