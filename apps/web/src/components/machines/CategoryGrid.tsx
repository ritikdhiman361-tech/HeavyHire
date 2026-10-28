"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.get<Category[]>("/categories"), staleTime: 10 * 60_000 });
}

export const categoryName = (c: { nameEn: string; nameHi: string }, locale: string) => (locale === "hi" ? c.nameHi : c.nameEn);

/** Big picture tiles: tap one to see those machines. */
export function CategoryGrid() {
  const locale = useLocale();
  const { data, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-stone-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {data?.map((c) => (
        <Link
          key={c.id}
          href={{ pathname: "/search", query: { category: c.slug } }}
          className="group flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white p-3 text-center transition hover:border-brand-500 hover:shadow-sm"
        >
          <img src={c.iconUrl ?? `/categories/${c.slug}.svg`} alt="" className="aspect-square w-full rounded-xl object-cover" />
          <span className="text-sm font-semibold leading-tight">{categoryName(c, locale)}</span>
        </Link>
      ))}
    </div>
  );
}
