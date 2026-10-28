"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { PhoneLogin } from "@/components/forms/PhoneLogin";
import { Card } from "@/components/ui/Card";

function LoginInner() {
  const t = useTranslations("login");
  const router = useRouter();
  const next = useSearchParams().get("next");

  return (
    <div className="mx-auto max-w-sm pt-6">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="mb-6 mt-1 text-stone-600">{t("subtitle")}</p>
      <Card className="p-5">
        {/* Only allow redirects inside our own site */}
        <PhoneLogin onDone={() => router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/")} />
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
