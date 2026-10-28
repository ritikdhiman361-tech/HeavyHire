"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import type { VendorMachine } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge, EmptyState, ErrorBox } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const tone = { PENDING: "yellow", APPROVED: "green", REJECTED: "red", PAUSED: "stone" } as const;

export default function VendorMachinesPage() {
  const t = useTranslations("vendor.machines");
  const c = useTranslations("common");
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["vendor-machines"], queryFn: () => api.get<VendorMachine[]>("/vendor/machines") });

  const toggle = useMutation({
    mutationFn: (m: VendorMachine) => api.post(`/vendor/machines/${m.id}/${m.status === "PAUSED" ? "resume" : "pause"}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendor-machines"] }),
    onError: (e: ApiError) => toast(e.message, "error"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("title")}</h1>
        <Link href="/vendor/machines/new" className="inline-flex min-h-11 items-center rounded-xl bg-brand-500 px-4 font-semibold">
          + {t("add")}
        </Link>
      </div>
      {q.isLoading && <PageSpinner />}
      {q.isError && <ErrorBox error={q.error} onRetry={() => q.refetch()} />}
      {q.data?.length === 0 && <EmptyState title={t("empty")} />}
      <div className="grid gap-3 md:grid-cols-2">
        {q.data?.map((m) => (
          <div key={m.id} className="rounded-2xl border border-stone-200 bg-white p-3">
            <Link href={`/vendor/machines/${m.id}`} className="flex gap-3">
              <img src={m.photos[0]?.url ?? `/categories/${m.category.slug}.svg`} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-bold">
                    {m.brand} {m.model}
                  </p>
                  <Badge tone={tone[m.status]}>{t(`status.${m.status}`)}</Badge>
                </div>
                <p className="text-sm text-stone-600">
                  {m.pricePerHour ? `${formatRupees(m.pricePerHour)}${c("perHour")}` : ""}
                  {m.pricePerHour && m.pricePerDay ? " · " : ""}
                  {m.pricePerDay ? `${formatRupees(m.pricePerDay)}${c("perDay")}` : ""}
                </p>
                <p className="text-sm text-stone-500">{t("bookingsCount", { count: m._count?.bookings ?? 0 })}</p>
                {m.status === "REJECTED" && m.rejectionReason && <p className="mt-1 text-sm text-red-600">{m.rejectionReason}</p>}
              </div>
            </Link>
            {(m.status === "APPROVED" || m.status === "PAUSED") && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => toggle.mutate(m)} loading={toggle.isPending && toggle.variables?.id === m.id}>
                {m.status === "PAUSED" ? t("resume") : t("pause")}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
