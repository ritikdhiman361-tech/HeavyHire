"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { formatRupees } from "@/lib/format";
import { Card, ErrorBox } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { PageSpinner } from "@/components/ui/Spinner";

interface Stats {
  bookingsByStatus: Record<string, number>;
  completedBookings: number;
  gmv: number;
  revenue: number;
  newUsers: number;
  pendingApprovals: { vendors: number; machines: number };
  topMachines: { id: string; name: string; vendor?: string; bookings: number; value: number }[];
  topCategories: { name: string; bookings: number }[];
}

export default function AdminStatsPage() {
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["admin-stats", days],
    queryFn: () => api.get<Stats>("/admin/stats", { from: new Date(Date.now() - days * 86_400_000).toISOString() }),
  });

  if (q.isLoading) return <PageSpinner />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data!;
  const pending = s.pendingApprovals.vendors + s.pendingApprovals.machines;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Dashboard</h1>
        <Select className="w-auto! py-2" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </Select>
      </div>

      {pending > 0 && (
        <Link href="/admin/approve" className="block rounded-xl bg-brand-500 px-4 py-3 font-semibold">
          ⏳ {s.pendingApprovals.vendors} vendors and {s.pendingApprovals.machines} machines waiting for approval →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Revenue (commission)", formatRupees(s.revenue)],
          ["Booking value (GMV)", formatRupees(s.gmv)],
          ["Completed bookings", s.completedBookings],
          ["New users", s.newUsers],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-bold">Bookings by status</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(s.bookingsByStatus).map(([status, n]) => (
              <li key={status} className="flex justify-between">
                <span>{status}</span>
                <strong>{n}</strong>
              </li>
            ))}
            {!Object.keys(s.bookingsByStatus).length && <li className="text-stone-500">No bookings yet</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">Top machines</h2>
          <ul className="space-y-1 text-sm">
            {s.topMachines.map((m) => (
              <li key={m.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {m.name} <span className="text-stone-500">· {m.vendor}</span>
                </span>
                <strong>{m.bookings}</strong>
              </li>
            ))}
            {!s.topMachines.length && <li className="text-stone-500">—</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">Top machine types</h2>
          <ul className="space-y-1 text-sm">
            {s.topCategories.map((c) => (
              <li key={c.name} className="flex justify-between">
                <span>{c.name}</span>
                <strong>{c.bookings}</strong>
              </li>
            ))}
            {!s.topCategories.length && <li className="text-stone-500">—</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
