"use client";

import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/format";
import { RequireLogin } from "@/components/RequireLogin";
import { EmptyState } from "@/components/ui/Card";

// The admin panel is for HeavyHire staff only, so it's kept in English.
const TABS = [
  { href: "/admin", label: "Stats" },
  { href: "/admin/approve", label: "Approve" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  if (user?.role !== "ADMIN") return <EmptyState title="Admins only" />;

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-stone-200 px-4">
        {TABS.map((tab) => {
          const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={classNames("shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold", active ? "border-brand-500" : "border-transparent text-stone-500")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireLogin>
      <AdminShell>{children}</AdminShell>
    </RequireLogin>
  );
}
