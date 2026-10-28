import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: { default: `HeavyHire – ${t("tagline")}`, template: "%s | HeavyHire" },
    description: t("tagline"),
    icons: { icon: "/favicon.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#f5b301", width: "device-width", initialScale: 1 };

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // suppressHydrationWarning: browser extensions (e.g. Dark Reader) add attributes to <html>
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <Providers>
            <Header />
            {/* pb-24 leaves room for the bottom bar on phones */}
            <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-5xl px-4 pb-28 pt-4 md:pb-12">{children}</main>
            <BottomNav />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
