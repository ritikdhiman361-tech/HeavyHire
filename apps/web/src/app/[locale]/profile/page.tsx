"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/types";
import { RequireLogin } from "@/components/RequireLogin";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

function Profile() {
  const t = useTranslations("profile");
  const c = useTranslations("common");
  const { user, signOut, reload } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch<Me>("/me", { name, email });
      await reload();
      toast(t("saved"));
    } catch (err) {
      toast((err as ApiError).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="text-stone-600">{user?.phone}</p>

      <Card>
        <form onSubmit={save} className="space-y-4">
          <Field label={t("name")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label={t("email")}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Button type="submit" loading={busy}>
            {c("save")}
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        <Link href={user?.vendor ? "/vendor/bookings" : "/vendor/join"} className="flex items-center justify-between rounded-2xl bg-brand-500 p-4 font-bold">
          🚜 {user?.vendor ? t("vendorDashboard") : t("vendorCta")} <span>→</span>
        </Link>
        {user?.role === "ADMIN" && (
          <Link href="/admin" className="flex items-center justify-between rounded-2xl bg-ink p-4 font-bold text-white">
            🛠️ {t("adminPanel")} <span>→</span>
          </Link>
        )}
      </div>

      <p className="text-center text-sm text-stone-500">{t("help")}</p>
      <Button
        variant="outline"
        full
        onClick={async () => {
          await signOut();
          router.replace("/");
        }}
      >
        {t("logout")}
      </Button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireLogin>
      <Profile />
    </RequireLogin>
  );
}
