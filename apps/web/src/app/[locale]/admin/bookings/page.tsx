"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BOOKING_STATUSES } from "@heavyhire/shared";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatRupees } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { StatusBadge } from "@/components/booking/Status";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface AdminBooking extends Booking {
  renter: { id: string; name: string | null; phone: string };
  vendor: { id: string; businessName: string; phone: string };
  operator: { name: string | null; phone: string | null };
  commissionAmount: number;
  vendorAmount: number;
}

const OPEN = ["PENDING_PAYMENT", "REQUESTED", "CONFIRMED", "ON_THE_WAY", "WORKING"];

function BookingRow({ b }: { b: AdminBooking }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"cancel" | "refund" | null>(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const paidLeft = b.price.amountPaid - b.price.refundedAmount;

  const act = useMutation({
    mutationFn: () =>
      mode === "cancel"
        ? api.post<{ refundAmount: number }>(`/admin/bookings/${b.id}/cancel`, { reason, refundAmount: amount ? Math.round(Number(amount) * 100) : undefined })
        : api.post<{ refundAmount: number }>(`/admin/bookings/${b.id}/refund`, { reason, amount: Math.round(Number(amount) * 100) }),
    onSuccess: (r) => {
      toast(`Done. Refunded ${formatRupees(r.refundAmount)}`);
      setMode(null);
      void qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: ApiError) => toast(e.message, "error"),
  });

  return (
    <Card className="space-y-2">
      <button className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setOpen(!open)}>
        <div>
          <p className="font-bold">
            {b.bookingNumber} · {b.machine.name}
          </p>
          <p className="text-sm text-stone-500">
            {formatDateTime(b.startAt)} · {b.renter.name ?? b.renter.phone} → {b.vendor.businessName}
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={b.status} />
          <p className="mt-1 text-sm font-semibold">{formatRupees(b.price.totalAmount)}</p>
        </div>
      </button>
      {open && (
        <div className="space-y-3 rounded-xl bg-stone-50 p-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-stone-500">Renter</span>
            <span>
              {b.renter.name} · <a href={`tel:${b.renter.phone}`}>{b.renter.phone}</a>
            </span>
            <span className="text-stone-500">Vendor</span>
            <span>
              {b.vendor.businessName} · <a href={`tel:${b.vendor.phone}`}>{b.vendor.phone}</a>
            </span>
            <span className="text-stone-500">Site</span>
            <span>{b.siteAddress}</span>
            <span className="text-stone-500">Paid online</span>
            <span>
              {formatRupees(b.price.amountPaid)} ({b.price.paymentPlan}) · refunded {formatRupees(b.price.refundedAmount)}
            </span>
            <span className="text-stone-500">Commission</span>
            <span>{formatRupees(b.commissionAmount)}</span>
          </div>
          <ul className="space-y-0.5 text-xs text-stone-600">
            {b.events.map((e, i) => (
              <li key={i}>
                {formatDateTime(e.createdAt)} — {e.status} {e.note ? `(${e.note})` : ""}
              </li>
            ))}
          </ul>
          {mode ? (
            <div className="space-y-2">
              <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Input
                inputMode="decimal"
                placeholder={mode === "cancel" ? `Refund ₹ (empty = all ${formatRupees(paidLeft)})` : `Refund ₹ (max ${formatRupees(paidLeft)})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="danger" onClick={() => act.mutate()} loading={act.isPending} disabled={reason.trim().length < 2 || (mode === "refund" && !amount)}>
                  {mode === "cancel" ? "Cancel booking" : "Refund"}
                </Button>
                <Button variant="ghost" onClick={() => setMode(null)}>
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {OPEN.includes(b.status) && (
                <Button size="sm" variant="outline" onClick={() => setMode("cancel")}>
                  Cancel booking
                </Button>
              )}
              {paidLeft > 0 && (
                <Button size="sm" variant="outline" onClick={() => setMode("refund")}>
                  Refund
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function AdminBookingsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ["admin-bookings", q, status, page],
    queryFn: () => api.list<AdminBooking>("/admin/bookings", { q, status, page, limit: 20 }),
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input placeholder="Search HH-1001, phone or name" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
        <Select className="w-auto!" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
          <option value="">All</option>
          {BOOKING_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
      {list.isLoading && <PageSpinner />}
      {list.data?.data.length === 0 && <EmptyState title="No bookings" />}
      {list.data?.data.map((b) => <BookingRow key={b.id} b={b} />)}
      {list.data && list.data.meta.total > page * 20 && (
        <Button variant="outline" full onClick={() => setPage(page + 1)}>
          Next page
        </Button>
      )}
    </div>
  );
}
