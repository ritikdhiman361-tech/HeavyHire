"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/format";

/** App-style bottom bar on phones. */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user } = useAuth();

  const items = [
    { href: "/", label: t("home"), icon: "🏠" },
    { href: "/search", label: t("search"), icon: "🔍" },
    { href: "/bookings", label: t("bookings"), icon: "📋" },
    ...(user?.vendor ? [{ href: "/vendor/bookings", label: t("vendor"), icon: "🚜" }] : []),
    { href: user ? "/profile" : "/login", label: user ? t("account") : t("login"), icon: "👤" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md justify-around">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                "flex min-w-16 flex-col items-center gap-0.5 py-2 text-xs font-medium",
                active ? "text-ink" : "text-stone-500",
              )}
            >
              <span className={classNames("text-xl", !active && "opacity-60 grayscale")}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
