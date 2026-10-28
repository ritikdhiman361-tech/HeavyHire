"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { classNames, todayIst } from "@/lib/format";
import { BENGALURU, getSavedPlace, type Place } from "@/lib/location";
import type { MachineCard as Machine } from "@/lib/types";
import { LocationChip } from "@/components/forms/LocationChip";
import { MachineCard } from "@/components/machines/MachineCard";
import { categoryName, useCategories } from "@/components/machines/CategoryGrid";
import { EmptyState, ErrorBox } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";

function SearchInner() {
  const t = useTranslations("search");
  const locale = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: categories } = useCategories();
  const [place, setPlace] = useState<Place | null>(null);

  const category = params.get("category") ?? "";
  const date = params.get("date") ?? "";
  const sort = params.get("sort") ?? "nearest";

  useEffect(() => setPlace(getSavedPlace() ?? BENGALURU), []);

  /** Filters live in the URL, so a search can be shared or bookmarked. */
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  // Tippers are usually rented by the day; the rest by the hour.
  const unit = category === "tipper" ? "DAY" : "HOUR";
  const query = useQuery({
    queryKey: ["search", category, date, sort, place?.lat, place?.lng],
    enabled: Boolean(place),
    queryFn: () =>
      api.list<Machine>("/machines/search", {
        category,
        date,
        sort,
        unit,
        lat: place!.lat,
        lng: place!.lng,
        limit: 50,
      }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <LocationChip onChange={setPlace} />

      {/* Category chips */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ slug: "", nameEn: t("all"), nameHi: t("all") }, ...(categories ?? [])].map((c) => (
          <button
            key={c.slug}
            onClick={() => setParam("category", c.slug)}
            className={classNames(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
              category === c.slug ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-stone-300",
            )}
          >
            {categoryName(c, locale)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input type="date" aria-label={t("date")} min={todayIst()} value={date} onChange={(e) => setParam("date", e.target.value)} />
        <Select aria-label={t("sort")} value={sort} onChange={(e) => setParam("sort", e.target.value)}>
          <option value="nearest">{t("sortNearest")}</option>
          <option value="price">{t("sortPrice")}</option>
          <option value="rating">{t("sortRating")}</option>
        </Select>
      </div>

      {query.isError && <ErrorBox error={query.error} onRetry={() => query.refetch()} />}

      {query.isLoading || !place ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-stone-200" />
          ))}
        </div>
      ) : query.data?.data.length === 0 ? (
        <EmptyState title={t("emptyTitle")} text={t("emptyText")} />
      ) : (
        <>
          <p className="text-sm text-stone-600">{t("results", { count: query.data?.meta.total ?? 0 })}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {query.data?.data.map((m) => <MachineCard key={m.id} machine={m} unit={unit} />)}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
