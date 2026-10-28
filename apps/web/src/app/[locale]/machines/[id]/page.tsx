"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { classNames, formatDate, formatRupees } from "@/lib/format";
import type { MachineDetail, Review } from "@/lib/types";
import { categoryName } from "@/components/machines/CategoryGrid";
import { Badge, Card, EmptyState } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { Stars } from "@/components/ui/Stars";

export default function MachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("machine");
  const c = useTranslations("common");
  const locale = useLocale();
  const [photo, setPhoto] = useState(0);

  const machine = useQuery({ queryKey: ["machine", id], queryFn: () => api.get<MachineDetail>(`/machines/${id}`) });
  const reviews = useQuery({ queryKey: ["reviews", id], queryFn: () => api.list<Review>(`/machines/${id}/reviews`) });

  if (machine.isLoading) return <PageSpinner />;
  if (!machine.data) return <EmptyState title={t("notFound")} />;
  const m = machine.data;
  const photos = m.photos.length ? m.photos : [`/categories/${m.category.slug}.svg`];

  const specs: [string, string][] = [
    [t("year"), String(m.year)],
    ...(m.capacity ? ([[t("capacity"), m.capacity]] as [string, string][]) : []),
    [t("area"), `${m.area ?? ""}${m.area ? ", " : ""}${m.city}`],
    [t("serviceArea"), `${m.serviceRadiusKm} km`],
    ...(m.pricePerHour ? ([[t("minBooking"), c("hours", { count: m.minHours })]] as [string, string][]) : []),
    [t("transport"), m.transportCharge ? formatRupees(m.transportCharge) : t("transportFree")],
  ];

  return (
    <div className="space-y-5 pb-20">
      {/* Photos */}
      <div className="-mx-4 md:mx-0">
        <img src={photos[photo]} alt={`${m.brand} ${m.model}`} className="aspect-[4/3] w-full bg-stone-200 object-cover md:max-h-96 md:rounded-2xl" />
        {photos.length > 1 && (
          <div className="mt-2 flex gap-2 overflow-x-auto px-4 md:px-0">
            {photos.map((p, i) => (
              <button key={p} onClick={() => setPhoto(i)} className={classNames("shrink-0 overflow-hidden rounded-lg ring-2", i === photo ? "ring-brand-500" : "ring-transparent")}>
                <img src={p} alt="" className="h-16 w-20 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">{categoryName(m.category, locale)}</p>
        <h1 className="text-2xl font-extrabold">
          {m.brand} {m.model}
        </h1>
        <p className="mt-1 text-stone-600">
          {m.ratingCount ? (
            <>
              <Stars value={m.ratingAvg} /> {m.ratingAvg.toFixed(1)} · {c("reviews", { count: m.ratingCount })}
            </>
          ) : (
            <Badge tone="green">{c("noReviews")}</Badge>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="yellow">👷 {c("withOperator")}</Badge>
          <Badge>{m.fuelIncluded ? `⛽ ${c("fuelIncluded")}` : c("fuelExtra")}</Badge>
          <Badge tone="green">✓ {t("verified")}</Badge>
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3">
        {m.pricePerHour && (
          <Card className="text-center">
            <p className="text-2xl font-extrabold">{formatRupees(m.pricePerHour)}</p>
            <p className="text-sm text-stone-500">{c("perHour")}</p>
          </Card>
        )}
        {m.pricePerDay && (
          <Card className="text-center">
            <p className="text-2xl font-extrabold">{formatRupees(m.pricePerDay)}</p>
            <p className="text-sm text-stone-500">{c("perDay")} (8 hrs)</p>
          </Card>
        )}
      </div>

      <Card>
        <h2 className="mb-2 font-bold">{t("specs")}</h2>
        <dl className="divide-y divide-stone-100">
          {specs.map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 text-sm">
              <dt className="text-stone-500">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {m.description && (
        <Card>
          <h2 className="mb-1 font-bold">{t("about")}</h2>
          <p className="whitespace-pre-line text-sm text-stone-700">{m.description}</p>
        </Card>
      )}

      <Card className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl font-bold">{m.vendor.businessName[0]}</div>
        <div>
          <p className="text-sm text-stone-500">{t("owner")}</p>
          <p className="font-semibold">{m.vendor.businessName}</p>
          <p className="text-xs text-stone-500">{t("memberSince", { date: formatDate(m.vendor.createdAt, locale) })}</p>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 font-bold">{t("reviewsTitle")}</h2>
        {reviews.data?.data.length ? (
          <div className="space-y-2">
            {reviews.data.data.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.renter.name}</span>
                  <Stars value={r.rating} className="text-sm" />
                </div>
                {r.comment && <p className="mt-1 text-sm text-stone-700">{r.comment}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">—</p>
        )}
      </section>

      {/* Sticky "Book now" bar */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-stone-200 bg-white p-3 md:bottom-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p>
            <span className="text-xl font-extrabold">{formatRupees((m.pricePerHour ?? m.pricePerDay)!)}</span>
            <span className="text-sm text-stone-500">{m.pricePerHour ? c("perHour") : c("perDay")}</span>
          </p>
          <Link href={`/book/${m.id}`} className="inline-flex min-h-12 items-center rounded-xl bg-brand-500 px-8 text-lg font-bold">
            {t("book")}
          </Link>
        </div>
      </div>
    </div>
  );
}
