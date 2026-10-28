"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/** One tap switches between English and Hindi (and remembers it for WhatsApp messages). */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { user } = useAuth();

  function toggle() {
    const next = locale === "en" ? "hi" : "en";
    const qs = search.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: next });
    if (user) void api.patch("/me", { language: next.toUpperCase() }).catch(() => undefined);
  }

  return (
    <button onClick={toggle} className={className ?? "rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium"}>
      {t("language")}
    </button>
  );
}
