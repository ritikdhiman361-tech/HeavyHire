"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { PageSpinner } from "./ui/Spinner";

/** Shows children only to logged-in users; others are sent to the login page. */
export function RequireLogin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) return <PageSpinner />;
  return <>{children}</>;
}
