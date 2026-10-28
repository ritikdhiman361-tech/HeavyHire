"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { classNames } from "@/lib/format";
import type { VendorBooking } from "@/lib/types";
import { VendorBookingCard } from "@/components/vendor/VendorBookingCard";
import { EmptyState, ErrorBox } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";

type Tab = "new" | "upcoming" | "ongoing" | "past";

export default function VendorBookingsPage() {
  const t = useTranslations("vendor.bookings");
  const [tab, setTab] = useState<Tab>("new");
  const q = useQuery({
    queryKey: ["vendor-bookings", tab],
    queryFn: () => api.list<VendorBooking>("/vendor/bookings", { status: tab }),
    refetchInterval: tab === "new" ? 30_000 : false, // new requests show up by themselves
  });
  const counts = useQuery({
    queryKey: ["vendor-dashboard"],
    queryFn: () => api.get<{ newRequests: number }>("/vendor/dashboard"),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-stone-200/60 p-1">
        {(["new", "upcoming", "ongoing", "past"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={classNames("relative rounded-lg py-2 text-sm font-semibold", tab === k ? "bg-white shadow" : "text-stone-600")}>
            {t(k)}
            {k === "new" && (counts.data?.newRequests ?? 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                {counts.data?.newRequests}
              </span>
            )}
          </button>
        ))}
      </div>
      {q.isLoading && <PageSpinner />}
      {q.isError && <ErrorBox error={q.error} onRetry={() => q.refetch()} />}
      {q.data?.data.length === 0 && <EmptyState title={t("empty")} />}
      <div className="grid gap-3 md:grid-cols-2">
        {q.data?.data.map((b) => <VendorBookingCard key={b.id} booking={b} />)}
      </div>
    </div>
  );
}
