"use client";

import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { MachineForm } from "@/components/vendor/MachineForm";

export default function NewMachinePage() {
  const t = useTranslations("vendor.form");
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">{t("titleNew")}</h1>
      <MachineForm
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["vendor-machines"] });
          router.replace("/vendor/machines");
        }}
      />
    </div>
  );
}
