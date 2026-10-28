"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatRupees } from "@/lib/format";
import type { MachineCard as Machine } from "@/lib/types";
import { categoryName } from "./CategoryGrid";

/** One machine in the search list: photo, name, price, distance, rating. */
export function MachineCard({ machine, unit }: { machine: Machine; unit: "HOUR" | "DAY" }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const price = unit === "HOUR" ? (machine.pricePerHour ?? machine.pricePerDay) : (machine.pricePerDay ?? machine.pricePerHour);
  const priceUnit = (unit === "HOUR" && machine.pricePerHour) || !machine.pricePerDay ? t("perHour") : t("perDay");

  return (
    <Link
      href={`/machines/${machine.id}`}
      className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 transition hover:border-brand-500 hover:shadow-sm"
    >
      <img
        src={machine.photo ?? `/categories/${machine.category.slug}.svg`}
        alt=""
        className="h-28 w-28 shrink-0 rounded-xl bg-stone-100 object-cover sm:h-32 sm:w-32"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{categoryName(machine.category, locale)}</p>
        <h3 className="truncate text-base font-bold">
          {machine.brand} {machine.model}
        </h3>
        <p className="text-sm text-stone-600">
          {machine.year}
          {machine.capacity ? ` · ${machine.capacity}` : ""}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          {machine.ratingCount ? (
            <>
              <span className="text-brand-600">★</span> {machine.ratingAvg.toFixed(1)} ({machine.ratingCount})
            </>
          ) : (
            <span className="rounded bg-green-100 px-1.5 text-xs font-semibold text-green-800">{t("noReviews")}</span>
          )}
          {machine.distanceKm != null && <> · {t("kmAway", { km: machine.distanceKm })}</>}
        </p>
        <div className="mt-auto flex items-end justify-between pt-1">
          <p>
            <span className="text-lg font-extrabold">{formatRupees(price ?? 0)}</span>
            <span className="text-sm text-stone-500">{priceUnit}</span>
          </p>
          <span className="text-xs text-stone-500">{machine.fuelIncluded ? t("fuelIncluded") : t("fuelExtra")}</span>
        </div>
      </div>
    </Link>
  );
}
