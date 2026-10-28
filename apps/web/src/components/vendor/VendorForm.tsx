"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { vendorSchema, vendorUpdateSchema } from "@heavyhire/shared";
import { api, ApiError, fieldErrors } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { classNames } from "@/lib/format";
import type { VendorProfile } from "@/lib/types";
import { DocumentUpload } from "../forms/FileUpload";
import { Button } from "../ui/Button";
import { Alert, Card } from "../ui/Card";
import { Field, Input } from "../ui/Field";

/** Vendor sign-up (and later edits): name, ID proof, where to send money. */
export function VendorForm({ initial, onSaved }: { initial?: VendorProfile | null; onSaved: () => void }) {
  const t = useTranslations("vendor.join");
  const c = useTranslations("common");
  const { reload } = useAuth();
  const [form, setForm] = useState({
    businessName: initial?.businessName ?? "",
    area: initial?.area ?? "",
    gstin: initial?.gstin ?? "",
    idDocType: initial?.idDocType ?? ("PAN" as "PAN" | "AADHAAR"),
    idDocKey: "",
    upiId: initial?.upiId ?? "",
    bankAccountName: initial?.bankAccountName ?? "",
    bankAccountNumber: "",
    bankIfsc: initial?.bankIfsc ?? "",
  });
  const [showBank, setShowBank] = useState(Boolean(initial?.bankIfsc));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  // When editing, an already-uploaded ID can be kept (the API keeps the old key).
  const needsId = !initial?.hasIdDoc;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const body = form;
    const parsed = (initial ? vendorUpdateSchema : vendorSchema).safeParse(body);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (initial) await api.patch("/vendor", body);
      else await api.post("/vendor", body);
      await reload();
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-4">
        <Field label={t("business")} error={errors.businessName}>
          <Input value={form.businessName} onChange={set("businessName")} autoComplete="organization" />
        </Field>
        <Field label={t("area")} error={errors.area}>
          <Input value={form.area} onChange={set("area")} placeholder={t("areaHint")} />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">{t("idTitle")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["PAN", "AADHAAR"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setForm({ ...form, idDocType: type })}
              className={classNames("rounded-xl border-2 py-3 font-semibold", form.idDocType === type ? "border-brand-500 bg-brand-50" : "border-stone-200")}
            >
              {type === "PAN" ? t("pan") : t("aadhaar")}
            </button>
          ))}
        </div>
        {form.idDocType === "AADHAAR" && <p className="text-sm text-stone-600">{t("aadhaarHint")}</p>}
        <DocumentUpload
          label={t("uploadId")}
          doneLabel={t("uploadId") + " ✓"}
          value={form.idDocKey || (needsId ? "" : "kept")}
          onUploaded={(key) => setForm({ ...form, idDocKey: key })}
          error={errors.idDocKey}
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">{t("payTitle")}</h2>
        <Field label={t("upi")} error={errors.upiId}>
          <Input value={form.upiId} onChange={set("upiId")} placeholder={t("upiHint")} autoCapitalize="none" />
        </Field>
        {showBank ? (
          <div className="space-y-4">
            <Field label={t("accountName")} error={errors.bankAccountName}>
              <Input value={form.bankAccountName} onChange={set("bankAccountName")} />
            </Field>
            <Field label={t("accountNumber")} error={errors.bankAccountNumber} hint={initial?.bankAccountNumber ?? undefined}>
              <Input inputMode="numeric" value={form.bankAccountNumber} onChange={set("bankAccountNumber")} />
            </Field>
            <Field label={t("ifsc")} error={errors.bankIfsc}>
              <Input value={form.bankIfsc} onChange={set("bankIfsc")} autoCapitalize="characters" />
            </Field>
          </div>
        ) : (
          <button type="button" onClick={() => setShowBank(true)} className="text-sm font-semibold text-brand-700">
            + {t("orBank")}
          </button>
        )}
        <Field label={`${t("gstin")} (${c("optional")})`} error={errors.gstin}>
          <Input value={form.gstin} onChange={set("gstin")} autoCapitalize="characters" />
        </Field>
      </Card>

      {error && <Alert tone="red">{error}</Alert>}
      <Button type="submit" size="lg" full loading={busy}>
        {initial ? c("save") : t("submit")}
      </Button>
    </form>
  );
}
