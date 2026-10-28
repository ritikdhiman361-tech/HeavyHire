"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type { VendorProfile } from "@/lib/types";
import { VendorForm } from "@/components/vendor/VendorForm";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export default function VendorProfilePage() {
  const t = useTranslations("profile");
  const toast = useToast();
  const q = useQuery({ queryKey: ["vendor-profile"], queryFn: () => api.get<VendorProfile | null>("/vendor") });
  if (q.isLoading) return <PageSpinner />;
  return (
    <div className="mx-auto max-w-lg">
      <VendorForm
        key={q.dataUpdatedAt}
        initial={q.data}
        onSaved={() => {
          toast(t("saved"));
          void q.refetch();
        }}
      />
    </div>
  );
}
