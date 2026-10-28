"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatRupees } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface Settings {
  commissionPercent: number;
  gstPercent: number;
  advancePercent: number;
  vendorReplyMinutes: number;
  freeCancelHoursBefore: number;
  lateCancelRefundPercent: number;
}
interface CategoryRow {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  sortOrder: number;
  isActive: boolean;
  _count: { machines: number };
}
interface PayoutRow {
  id: string;
  amount: number;
  createdAt: string;
  vendor: { businessName: string; upiId: string | null; bankAccountName: string | null; bankAccountNumber: string | null; bankIfsc: string | null };
  booking: { bookingNumber: number };
}

const FIELDS: [keyof Settings, string, string][] = [
  ["commissionPercent", "Commission %", "Taken from the rent on every booking"],
  ["gstPercent", "GST %", "Confirm the correct rate with your CA"],
  ["advancePercent", "Advance %", "Online part for the 'pay advance' option (must be ≥ commission)"],
  ["vendorReplyMinutes", "Vendor reply time (minutes)", "After this the booking expires and is refunded"],
  ["freeCancelHoursBefore", "Free cancellation (hours before start)", ""],
  ["lateCancelRefundPercent", "Late cancellation refund %", "Refund if the renter cancels later than that"],
];

function SettingsForm() {
  const toast = useToast();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: () => api.get<Settings>("/admin/settings") });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data) setForm(Object.fromEntries(FIELDS.map(([k]) => [k, String(q.data[k])])));
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => api.patch("/admin/settings", Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)]))),
    onSuccess: () => toast("Settings saved"),
    onError: (e: ApiError) => toast(e.message, "error"),
  });

  if (q.isLoading) return <PageSpinner />;
  return (
    <Card className="space-y-3">
      <h2 className="font-bold">Platform settings</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {FIELDS.map(([key, label, hint]) => (
          <Field key={key} label={label} hint={hint}>
            <Input inputMode="decimal" value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </Field>
        ))}
      </div>
      <Button onClick={() => save.mutate()} loading={save.isPending}>
        Save settings
      </Button>
    </Card>
  );
}

function Payouts() {
  const toast = useToast();
  const qc = useQueryClient();
  const [refs, setRefs] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ["admin-payouts"], queryFn: () => api.list<PayoutRow>("/admin/payouts", { status: "PENDING", limit: 50 }) });
  const pay = useMutation({
    mutationFn: (id: string) => api.post(`/admin/payouts/${id}/mark-paid`, { reference: refs[id] }),
    onSuccess: () => {
      toast("Marked as paid");
      void qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (e: ApiError) => toast(e.message, "error"),
  });

  return (
    <Card className="space-y-3">
      <h2 className="font-bold">Pending vendor payouts ({q.data?.meta.total ?? 0})</h2>
      <p className="text-sm text-stone-500">Send the money by UPI/bank transfer, then paste the UTR / reference here.</p>
      {q.data?.data.length === 0 && <p className="text-sm text-stone-500">Nothing to pay 🎉</p>}
      {q.data?.data.map((p) => (
        <div key={p.id} className="space-y-2 rounded-xl bg-stone-50 p-3 text-sm">
          <p>
            <strong>{formatRupees(p.amount)}</strong> → {p.vendor.businessName} · HH-{1000 + p.booking.bookingNumber} · {formatDateTime(p.createdAt)}
          </p>
          <p className="text-stone-600">
            {p.vendor.upiId ? `UPI: ${p.vendor.upiId}` : `Bank: ${p.vendor.bankAccountName}, ${p.vendor.bankAccountNumber}, ${p.vendor.bankIfsc}`}
          </p>
          <div className="flex gap-2">
            <Input placeholder="UTR / reference" value={refs[p.id] ?? ""} onChange={(e) => setRefs({ ...refs, [p.id]: e.target.value })} />
            <Button onClick={() => pay.mutate(p.id)} disabled={(refs[p.id] ?? "").trim().length < 2} loading={pay.isPending && pay.variables === p.id}>
              Paid
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function Categories() {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-categories"], queryFn: () => api.get<CategoryRow[]>("/admin/categories") });
  const [form, setForm] = useState({ slug: "", nameEn: "", nameHi: "" });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
    void qc.invalidateQueries({ queryKey: ["categories"] });
  };
  const add = useMutation({
    mutationFn: () => api.post("/admin/categories", { ...form, sortOrder: (q.data?.length ?? 0) + 1 }),
    onSuccess: () => {
      setForm({ slug: "", nameEn: "", nameHi: "" });
      refresh();
    },
    onError: (e: ApiError) => toast(e.message, "error"),
  });
  const toggle = useMutation({
    mutationFn: (c: CategoryRow) => api.patch(`/admin/categories/${c.id}`, { isActive: !c.isActive }),
    onSuccess: refresh,
  });

  return (
    <Card className="space-y-3">
      <h2 className="font-bold">Machine types</h2>
      <ul className="divide-y divide-stone-100 text-sm">
        {q.data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2">
            <span>
              {c.nameEn} / {c.nameHi} <span className="text-stone-500">({c._count.machines})</span> {!c.isActive && <Badge>hidden</Badge>}
            </span>
            <button className="font-semibold text-blue-700" onClick={() => toggle.mutate(c)}>
              {c.isActive ? "Hide" : "Show"}
            </button>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="slug e.g. forklift" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <Input placeholder="English name" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
        <Input placeholder="हिंदी नाम" value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })} />
        <Button onClick={() => add.mutate()} loading={add.isPending}>
          Add type
        </Button>
      </div>
    </Card>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <Payouts />
      <SettingsForm />
      <Categories />
    </div>
  );
}
