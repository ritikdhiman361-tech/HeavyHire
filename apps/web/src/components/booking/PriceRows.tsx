"use client";

import { useTranslations } from "next-intl";
import { formatRupees } from "@/lib/format";

interface Props {
  unit: "HOUR" | "DAY";
  quantity: number;
  rate: number;
  rentAmount: number;
  transportAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

/** Rent + delivery + GST = total. Shown before paying and on the booking page. */
export function PriceRows(p: Props) {
  const t = useTranslations("book");
  const c = useTranslations("common");
  const qty = p.unit === "HOUR" ? c("hours", { count: p.quantity }) : c("days", { count: p.quantity });

  return (
    <dl className="space-y-2 text-sm">
      <Row label={t("rent", { qty, rate: formatRupees(p.rate) })} value={formatRupees(p.rentAmount)} />
      <Row label={t("transport")} value={p.transportAmount ? formatRupees(p.transportAmount) : t("included")} />
      <Row label={t("gst", { percent: p.gstPercent })} value={formatRupees(p.gstAmount)} />
      <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold">
        <dt>{t("total")}</dt>
        <dd>{formatRupees(p.totalAmount)}</dd>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
