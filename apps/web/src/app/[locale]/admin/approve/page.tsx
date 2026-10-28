"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatRupees } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface VendorRow {
  id: string;
  businessName: string;
  idDocType: string;
  createdAt: string;
  user: { phone: string };
  _count: { machines: number };
}
interface VendorDetail {
  id: string;
  businessName: string;
  address: string | null;
  gstin: string | null;
  idDocType: string;
  idDocUrl: string | null;
  upiId: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  user: { phone: string; name: string | null };
}
interface MachineRow {
  id: string;
  brand: string;
  model: string;
  year: number;
  area: string | null;
  createdAt: string;
  category: { nameEn: string };
  photos: { url: string }[];
  vendor: { businessName: string; status: string };
}
interface MachineDetail {
  id: string;
  registrationNo: string | null;
  capacity: string | null;
  pricePerHour: number | null;
  pricePerDay: number | null;
  transportCharge: number;
  rcDocUrl: string | null;
  photos: { url: string }[];
  description: string | null;
  lat: number;
  lng: number;
}

/** Approve / reject buttons with a required reason for rejection. */
function Decide({ kind, id }: { kind: "vendors" | "machines"; id: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: (approve: boolean) => api.post(`/admin/${kind}/${id}/${approve ? "approve" : "reject"}`, approve ? {} : { reason }),
    onSuccess: (_d, approve) => {
      toast(approve ? "Approved" : "Rejected");
      void qc.invalidateQueries({ queryKey: ["admin-pending"] });
    },
    onError: (e: ApiError) => toast(e.message, "error"),
  });

  if (rejecting) {
    return (
      <div className="flex gap-2">
        <Input autoFocus placeholder="Reason (vendor will see this)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="danger" onClick={() => m.mutate(false)} loading={m.isPending} disabled={reason.trim().length < 2}>
          Reject
        </Button>
        <Button variant="ghost" onClick={() => setRejecting(false)}>
          ✕
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Button onClick={() => m.mutate(true)} loading={m.isPending && m.variables === true}>
        ✓ Approve
      </Button>
      <Button variant="outline" onClick={() => setRejecting(true)}>
        Reject
      </Button>
    </div>
  );
}

function VendorCard({ v }: { v: VendorRow }) {
  const [open, setOpen] = useState(false);
  const d = useQuery({ queryKey: ["admin-vendor", v.id], enabled: open, queryFn: () => api.get<VendorDetail>(`/admin/vendors/${v.id}`) });
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">{v.businessName}</p>
          <p className="text-sm text-stone-500">
            {v.user.phone} · {v.idDocType} · {v._count.machines} machines · {formatDateTime(v.createdAt)}
          </p>
        </div>
        <button className="text-sm font-semibold text-blue-700" onClick={() => setOpen(!open)}>
          {open ? "Hide" : "Details"}
        </button>
      </div>
      {open && d.data && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-stone-50 p-3 text-sm">
          <dt className="text-stone-500">Area</dt>
          <dd>{d.data.address ?? "—"}</dd>
          <dt className="text-stone-500">GSTIN</dt>
          <dd>{d.data.gstin ?? "—"}</dd>
          <dt className="text-stone-500">UPI</dt>
          <dd>{d.data.upiId ?? "—"}</dd>
          <dt className="text-stone-500">Bank</dt>
          <dd>{d.data.bankAccountNumber ? `${d.data.bankAccountName}, ${d.data.bankAccountNumber}, ${d.data.bankIfsc}` : "—"}</dd>
          <dt className="text-stone-500">ID document</dt>
          <dd>
            {d.data.idDocUrl ? (
              <a href={d.data.idDocUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">
                Open (15 min link)
              </a>
            ) : (
              "—"
            )}
          </dd>
        </dl>
      )}
      <Decide kind="vendors" id={v.id} />
    </Card>
  );
}

function MachineCard({ m }: { m: MachineRow }) {
  const [open, setOpen] = useState(false);
  const d = useQuery({ queryKey: ["admin-machine", m.id], enabled: open, queryFn: () => api.get<MachineDetail>(`/admin/machines/${m.id}`) });
  return (
    <Card className="space-y-3">
      <div className="flex gap-3">
        <img src={m.photos[0]?.url} alt="" className="h-16 w-16 rounded-lg bg-stone-100 object-cover" />
        <div className="flex-1">
          <p className="font-bold">
            {m.brand} {m.model} ({m.year})
          </p>
          <p className="text-sm text-stone-500">
            {m.category.nameEn} · {m.area ?? "—"} · {m.vendor.businessName}{" "}
            <Badge tone={m.vendor.status === "APPROVED" ? "green" : "yellow"}>vendor {m.vendor.status.toLowerCase()}</Badge>
          </p>
        </div>
        <button className="self-start text-sm font-semibold text-blue-700" onClick={() => setOpen(!open)}>
          {open ? "Hide" : "Details"}
        </button>
      </div>
      {open && d.data && (
        <div className="space-y-2 rounded-xl bg-stone-50 p-3 text-sm">
          <div className="flex gap-2 overflow-x-auto">
            {d.data.photos.map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noreferrer">
                <img src={p.url} alt="" className="h-24 w-32 rounded-lg object-cover" />
              </a>
            ))}
          </div>
          <p>
            Reg: <strong>{d.data.registrationNo ?? "—"}</strong> · Size: {d.data.capacity ?? "—"}
          </p>
          <p>
            Price: {d.data.pricePerHour ? `${formatRupees(d.data.pricePerHour)}/hr ` : ""}
            {d.data.pricePerDay ? `${formatRupees(d.data.pricePerDay)}/day ` : ""}· Delivery {formatRupees(d.data.transportCharge)}
          </p>
          <p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${d.data.lat},${d.data.lng}`} target="_blank" rel="noreferrer" className="text-blue-700 underline">
              Location on map
            </a>
            {" · "}
            {d.data.rcDocUrl ? (
              <a href={d.data.rcDocUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">
                Open RC
              </a>
            ) : (
              "No RC"
            )}
          </p>
          {d.data.description && <p className="text-stone-600">{d.data.description}</p>}
        </div>
      )}
      <Decide kind="machines" id={m.id} />
    </Card>
  );
}

export default function ApprovePage() {
  const vendors = useQuery({ queryKey: ["admin-pending", "vendors"], queryFn: () => api.list<VendorRow>("/admin/vendors", { status: "PENDING", limit: 50 }) });
  const machines = useQuery({ queryKey: ["admin-pending", "machines"], queryFn: () => api.list<MachineRow>("/admin/machines", { status: "PENDING", limit: 50 }) });

  if (vendors.isLoading || machines.isLoading) return <PageSpinner />;
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Vendors ({vendors.data?.meta.total ?? 0})</h2>
        {vendors.data?.data.length === 0 && <p className="text-sm text-stone-500">No vendors waiting 🎉</p>}
        {vendors.data?.data.map((v) => <VendorCard key={v.id} v={v} />)}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Machines ({machines.data?.meta.total ?? 0})</h2>
        {machines.data?.data.length === 0 && <EmptyState title="No machines waiting" />}
        {machines.data?.data.map((m) => <MachineCard key={m.id} m={m} />)}
      </section>
    </div>
  );
}
