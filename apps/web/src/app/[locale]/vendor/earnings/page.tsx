"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { formatDate, formatRupees } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";

interface Dashboard {
  newRequests: number;
  todayJobs: number;
  monthEarnings: number;
  pendingPayout: number;
}

interface Payout {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED";
  reference: string | null;
  createdAt: string;
  paidAt: string | null;
  booking: { bookingNumber: string };
}

export default function EarningsPage() {
  const t = useTranslations("vendor.earnings");
  const locale = useLocale();
  const dash = useQuery({ queryKey: ["vendor-dashboard"], queryFn: () => api.get<Dashboard>("/vendor/dashboard") });
  const payouts = useQuery({ queryKey: ["vendor-payouts"], queryFn: () => api.list<Payout>("/vendor/payouts") });

  if (dash.isLoading) return <PageSpinner />;
  const d = dash.data;
  const tiles = [
    [t("thisMonth"), formatRupees(d?.monthEarnings ?? 0)],
    [t("pending"), formatRupees(payouts.data?.meta.pendingAmount ?? 0)],
    [t("newRequests"), String(d?.newRequests ?? 0)],
    [t("today"), String(d?.todayJobs ?? 0)],
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{t("title")}</h1>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </Card>
        ))}
      </div>
      <p className="text-sm text-stone-500">{t("note")}</p>

      <h2 className="pt-2 font-bold">{t("history")}</h2>
      {payouts.data?.data.length === 0 && <EmptyState title={t("empty")} />}
      <div className="space-y-2">
        {payouts.data?.data.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{formatRupees(p.amount)}</p>
              <p className="text-sm text-stone-500">
                {p.booking.bookingNumber} · {formatDate(p.paidAt ?? p.createdAt, locale)}
                {p.reference ? ` · ${p.reference}` : ""}
              </p>
            </div>
            <Badge tone={p.status === "PAID" ? "green" : p.status === "FAILED" ? "red" : "yellow"}>{t(`status.${p.status}`)}</Badge>
          </Card>
        ))}
      </div>
      {payouts.data && (
        <p className="text-right text-sm text-stone-500">
          {t("paid")}: <strong>{formatRupees(payouts.data.meta.paidAmount ?? 0)}</strong>
        </p>
      )}
    </div>
  );
}
