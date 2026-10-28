import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Link } from "@/i18n/navigation";
import { CategoryGrid } from "@/components/machines/CategoryGrid";
import { LocationChip } from "@/components/forms/LocationChip";

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  const t = useTranslations("home");

  return (
    <div className="space-y-10">
      <section className="-mx-4 -mt-4 bg-ink px-4 pb-8 pt-8 text-white md:rounded-b-3xl">
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-stone-300">{t("subtitle")}</p>
        <div className="mt-5">
          <LocationChip dark />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("chooseMachine")}</h2>
        <CategoryGrid />
      </section>

      <section className="grid grid-cols-3 gap-2 text-center text-xs font-medium text-stone-700 sm:text-sm">
        {[
          ["✅", t("trust1")],
          ["💸", t("trust2")],
          ["🗣️", t("trust3")],
        ].map(([icon, text]) => (
          <div key={text} className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
            <div className="text-2xl">{icon}</div>
            {text}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("howTitle")}</h2>
        <ol className="space-y-3">
          {[t("how1"), t("how2"), t("how3")].map((text, i) => (
            <li key={text} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-stone-200">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 font-bold">{i + 1}</span>
              <span className="font-medium">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl bg-brand-500 p-6">
        <h2 className="text-xl font-extrabold">{t("ownerTitle")}</h2>
        <p className="mt-1 text-ink/80">{t("ownerText")}</p>
        <Link href="/vendor/join" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-ink px-5 font-semibold text-white">
          {t("ownerCta")} →
        </Link>
      </section>
    </div>
  );
}
