"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/format";
import { RequireLogin } from "@/components/RequireLogin";
import { Alert } from "@/components/ui/Card";

function VendorShell({ children }: { children: ReactNode }) {
  const t = useTranslations("vendor");
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const vendor = user?.vendor;
  const onJoin = pathname.startsWith("/vendor/join");

  // No vendor profile yet → go to sign-up.
  useEffect(() => {
    if (user && !vendor && !onJoin) router.replace("/vendor/join");
  }, [user, vendor, onJoin, router]);

  if (!vendor) return onJoin ? <>{children}</> : null;

  const tabs = [
    { href: "/vendor/bookings", label: t("tabs.bookings") },
    { href: "/vendor/machines", label: t("tabs.machines") },
    { href: "/vendor/earnings", label: t("tabs.earnings") },
    { href: "/vendor/profile", label: t("tabs.profile") },
  ];

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-stone-200 px-4">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={classNames(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold",
              pathname.startsWith(tab.href) ? "border-brand-500 text-ink" : "border-transparent text-stone-500",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {vendor.status === "PENDING" && <Alert>⏳ {t("pending")}</Alert>}
      {vendor.status === "REJECTED" && (
        <Alert tone="red">
          {t("rejected", { reason: vendor.rejectionReason ?? "" })}{" "}
          <Link href="/vendor/profile" className="font-semibold underline">
            {t("fixProfile")}
          </Link>
        </Alert>
      )}
      {children}
    </div>
  );
}

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <RequireLogin>
      <VendorShell>{children}</VendorShell>
    </RequireLogin>
  );
}
