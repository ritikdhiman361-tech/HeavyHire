"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { VendorForm } from "@/components/vendor/VendorForm";
import { useEffect } from "react";

export default function VendorJoinPage() {
  const t = useTranslations("vendor.join");
  const router = useRouter();
  const { user } = useAuth();

  // Already a vendor? Go to the dashboard.
  useEffect(() => {
    if (user?.vendor) router.replace("/vendor/bookings");
  }, [user, router]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <p className="text-stone-600">{t("subtitle")}</p>
      </div>
      <VendorForm onSaved={() => router.replace("/vendor/machines/new")} />
      <p className="text-center text-sm text-stone-500">{t("next")}</p>
    </div>
  );
}
