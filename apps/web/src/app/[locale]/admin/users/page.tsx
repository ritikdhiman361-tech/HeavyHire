"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  role: "USER" | "ADMIN";
  isBlocked: boolean;
  createdAt: string;
  vendor: { id: string; status: string } | null;
  _count: { bookings: number };
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const toast = useToast();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-users", q], queryFn: () => api.list<UserRow>("/admin/users", { q, limit: 50 }) });
  const toggle = useMutation({
    mutationFn: (u: UserRow) => api.post(`/admin/users/${u.id}/${u.isBlocked ? "unblock" : "block"}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (e: ApiError) => toast(e.message, "error"),
  });

  return (
    <div className="space-y-3">
      <Input placeholder="Search phone or name" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.isLoading && <PageSpinner />}
      {list.data?.data.map((u) => (
        <Card key={u.id} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">
              {u.name ?? "—"} <span className="font-normal text-stone-500">{u.phone}</span>
            </p>
            <p className="flex flex-wrap gap-1 text-sm text-stone-500">
              {u.role === "ADMIN" && <Badge tone="blue">admin</Badge>}
              {u.vendor && <Badge tone="yellow">vendor {u.vendor.status.toLowerCase()}</Badge>}
              {u.isBlocked && <Badge tone="red">blocked</Badge>}
              <span>
                {u._count.bookings} bookings · joined {formatDateTime(u.createdAt)}
              </span>
            </p>
          </div>
          {u.role !== "ADMIN" && (
            <Button size="sm" variant={u.isBlocked ? "outline" : "danger"} onClick={() => toggle.mutate(u)} loading={toggle.isPending && toggle.variables?.id === u.id}>
              {u.isBlocked ? "Unblock" : "Block"}
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}
