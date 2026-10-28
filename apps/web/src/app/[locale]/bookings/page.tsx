"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { classNames, formatDateTime, formatRupees } from "@/lib/format";
import type { RenterBooking } from "@/lib/types";
import { RequireLogin } from "@/components/RequireLogin";
import { StatusBadge } from "@/components/booking/Status";
import { EmptyState, ErrorBox } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";

function BookingsList() {
  const t = useTranslations("bookings");
  const locale = useLocale();
  const [tab, setTab] = useState<"active" | "past">("active");
  const q = useQuery({ queryKey: ["my-bookings", tab], queryFn: () => api.list<RenterBooking>("/bookings", { status: tab }) });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-200/60 p-1">
        {(["active", "past"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={classNames("rounded-lg py-2 font-semibold", tab === k ? "bg-white shadow" : "text-stone-600")}>
            {t(k)}
          </button>
        ))}
      </div>
      {q.isLoading && <PageSpinner />}
      {q.isError && <ErrorBox error={q.error} onRetry={() => q.refetch()} />}
      {q.data?.data.length === 0 && (
        <EmptyState title={t("empty")}>
          <Link href="/search" className="inline-flex min-h-11 items-center rounded-xl bg-brand-500 px-5 font-semibold">
            {t("emptyCta")}
          </Link>
        </EmptyState>
      )}
      <div className="space-y-3">
        {q.data?.data.map((b) => (
          <Link key={b.id} href={`/bookings/${b.id}`} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 hover:border-brand-500">
            <img src={b.machine.photo ?? `/categories/${b.machine.category.slug}.svg`} alt="" className="h-20 w-20 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-bold">{b.machine.name}</p>
                <StatusBadge status={b.status} />
              </div>
              <p className="text-sm text-stone-600">{formatDateTime(b.startAt, locale)}</p>
              <p className="text-sm text-stone-500">
                {b.bookingNumber} · {formatRupees(b.price.totalAmount)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <RequireLogin>
      <BookingsList />
    </RequireLogin>
  );
}
