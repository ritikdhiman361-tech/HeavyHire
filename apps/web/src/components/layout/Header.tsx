"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { LanguageSwitch } from "./LanguageSwitch";

export function Header() {
  const t = useTranslations("nav");
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-base">🚜</span>
          <span>
            Heavy<span className="text-brand-600">Hire</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          {/* Desktop links (on phones the bottom bar is used instead) */}
          <div className="hidden items-center gap-1 md:flex">
            <Link href="/search" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-100">
              {t("search")}
            </Link>
            {user && (
              <Link href="/bookings" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-100">
                {t("bookings")}
              </Link>
            )}
            {user?.vendor && (
              <Link href="/vendor/bookings" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-100">
                {t("vendor")}
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-100">
                {t("admin")}
              </Link>
            )}
            <Link href={user ? "/profile" : "/login"} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-stone-100">
              {user ? t("account") : t("login")}
            </Link>
          </div>
          <Suspense>
            <LanguageSwitch />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
