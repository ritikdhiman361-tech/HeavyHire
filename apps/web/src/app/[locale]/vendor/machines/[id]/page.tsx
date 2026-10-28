"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { formatDate, todayIst } from "@/lib/format";
import type { VendorMachine } from "@/lib/types";
import { MachineForm } from "@/components/vendor/MachineForm";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export default function EditMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("vendor.form");
  const c = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [from, setFrom] = useState(todayIst(1));
  const [to, setTo] = useState(todayIst(1));

  const q = useQuery({ queryKey: ["vendor-machine", id], queryFn: () => api.get<VendorMachine>(`/vendor/machines/${id}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["vendor-machine", id] });

  // Blocks cover whole days in India time: from 00:00 on "from" to 00:00 after "to".
  const addBlock = useMutation({
    mutationFn: () =>
      api.post(`/vendor/machines/${id}/blocks`, {
        startAt: `${from}T00:00:00+05:30`,
        endAt: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000).toISOString(),
      }),
    onSuccess: refresh,
    onError: (e: ApiError) => toast(e.message, "error"),
  });
  const removeBlock = useMutation({
    mutationFn: (blockId: string) => api.delete(`/vendor/machines/${id}/blocks/${blockId}`),
    onSuccess: refresh,
  });

  if (q.isLoading) return <PageSpinner />;
  if (!q.data) return <EmptyState title={c("somethingWrong")} />;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">{t("titleEdit")}</h1>

      <Card className="space-y-3">
        <h2 className="font-bold">{t("blocks")}</h2>
        {q.data.blocks?.length ? (
          <ul className="space-y-2">
            {q.data.blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
                <span>
                  {formatDate(b.startAt, locale)} → {formatDate(new Date(new Date(b.endAt).getTime() - 1), locale)}
                </span>
                <button className="font-semibold text-red-600" onClick={() => removeBlock.mutate(b.id)}>
                  {c("delete")}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-500">{t("noBlocks")}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("blockFrom")}>
            <Input type="date" min={todayIst()} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t("blockTo")}>
            <Input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <Button variant="outline" full onClick={() => addBlock.mutate()} loading={addBlock.isPending} disabled={to < from}>
          {t("blockAdd")}
        </Button>
      </Card>

      <MachineForm
        key={q.dataUpdatedAt}
        initial={q.data}
        onSaved={() => {
          toast("✓");
          void qc.invalidateQueries({ queryKey: ["vendor-machines"] });
          router.replace("/vendor/machines");
        }}
      />
    </div>
  );
}
