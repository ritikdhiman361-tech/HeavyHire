"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { machineSchema } from "@heavyhire/shared";
import { api, ApiError, fieldErrors } from "@/lib/api";
import { paiseToInput } from "@/lib/format";
import { BENGALURU_AREAS } from "@/lib/areas";
import type { VendorMachine } from "@/lib/types";
import { categoryName, useCategories } from "../machines/CategoryGrid";
import { DocumentUpload, PhotoUpload } from "../forms/FileUpload";
import { PlaceSearch } from "../forms/PlaceSearch";
import { Button } from "../ui/Button";
import { Alert, Card } from "../ui/Card";
import { Field, Input, Select, Textarea } from "../ui/Field";

/** Add or edit a machine, all on one screen. Prices are typed in rupees. */
export function MachineForm({ initial, onSaved }: { initial?: VendorMachine; onSaved: (m: VendorMachine) => void }) {
  const t = useTranslations("vendor.form");
  const locale = useLocale();
  const { data: categories } = useCategories();

  const [form, setForm] = useState({
    categoryId: initial?.categoryId ?? "",
    brand: initial?.brand ?? "",
    model: initial?.model ?? "",
    year: initial ? String(initial.year) : "",
    registrationNo: initial?.registrationNo ?? "",
    capacity: initial?.capacity ?? "",
    description: initial?.description ?? "",
    rcDocKey: initial?.rcDocKey ?? "",
    area: initial?.area ?? "",
    serviceRadiusKm: String(initial?.serviceRadiusKm ?? 30),
    pricePerHour: paiseToInput(initial?.pricePerHour),
    pricePerDay: paiseToInput(initial?.pricePerDay),
    minHours: String(initial?.minHours ?? 4),
    transportCharge: paiseToInput(initial?.transportCharge) || "0",
  });
  const [fuelIncluded, setFuelIncluded] = useState(initial?.fuelIncluded ?? true);
  const [place, setPlace] = useState(initial ? { lat: initial.lat, lng: initial.lng, label: initial.area ?? "" } : null);
  const [photos, setPhotos] = useState(initial?.photos.map(({ url, publicId }) => ({ url, publicId })) ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const body = {
      ...form,
      pricePerHour: form.pricePerHour || undefined,
      pricePerDay: form.pricePerDay || undefined,
      registrationNo: form.registrationNo || undefined,
      capacity: form.capacity || undefined,
      description: form.description || undefined,
      lat: place?.lat,
      lng: place?.lng,
      fuelIncluded,
      photos,
    };
    // Check on the phone first (same rules as the server), for instant feedback.
    const parsed = machineSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      // The API takes rupees and stores paise, like the shared schema.
      const saved = initial ? await api.patch<VendorMachine>(`/vendor/machines/${initial.id}`, body) : await api.post<VendorMachine>("/vendor/machines", body);
      onSaved(saved);
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
        <Field label={t("type")} error={errors.categoryId}>
          <Select value={form.categoryId} onChange={set("categoryId")}>
            <option value="">—</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c, locale)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("brand")} error={errors.brand}>
            <Input value={form.brand} onChange={set("brand")} placeholder={t("brandHint")} />
          </Field>
          <Field label={t("model")} error={errors.model}>
            <Input value={form.model} onChange={set("model")} placeholder={t("modelHint")} />
          </Field>
          <Field label={t("year")} error={errors.year}>
            <Input inputMode="numeric" maxLength={4} value={form.year} onChange={set("year")} placeholder="2021" />
          </Field>
          <Field label={t("regNo")} error={errors.registrationNo}>
            <Input value={form.registrationNo} onChange={set("registrationNo")} placeholder="KA01AB1234" autoCapitalize="characters" />
          </Field>
        </div>
        <Field label={t("capacity")} error={errors.capacity}>
          <Input value={form.capacity} onChange={set("capacity")} placeholder={t("capacityHint")} />
        </Field>
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="font-bold">{t("photos")}</h2>
          <p className="text-sm text-stone-500">{t("photosHint")}</p>
        </div>
        <PhotoUpload photos={photos} onChange={setPhotos} addLabel={t("addPhoto")} />
        {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
        <h2 className="pt-2 font-bold">{t("rc")}</h2>
        <DocumentUpload label={t("uploadRc")} doneLabel={t("uploaded")} value={form.rcDocKey} onUploaded={(k) => setForm({ ...form, rcDocKey: k })} error={errors.rcDocKey} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">{t("location")}</h2>
        {place ? (
          <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 text-green-900">
            <span>📍 {place.label || `${place.lat.toFixed(3)}, ${place.lng.toFixed(3)}`}</span>
            <button type="button" className="text-sm font-semibold underline" onClick={() => setPlace(null)}>
              ✎
            </button>
          </div>
        ) : (
          <PlaceSearch
            onPick={(p) => {
              setPlace(p);
              if (!form.area && BENGALURU_AREAS.some((a) => a.label === p.label)) setForm({ ...form, area: p.label });
            }}
          />
        )}
        {errors.lat && <p className="text-sm text-red-600">{errors.lat}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("area")}>
            <Input value={form.area} onChange={set("area")} placeholder="Whitefield" />
          </Field>
          <Field label={t("radius")} error={errors.serviceRadiusKm}>
            <Input inputMode="numeric" value={form.serviceRadiusKm} onChange={set("serviceRadiusKm")} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-bold">{t("pricing")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("pricePerHour")} error={errors.pricePerHour}>
            <Input inputMode="numeric" value={form.pricePerHour} onChange={set("pricePerHour")} placeholder="1000" />
          </Field>
          <Field label={t("pricePerDay")} error={errors.pricePerDay}>
            <Input inputMode="numeric" value={form.pricePerDay} onChange={set("pricePerDay")} placeholder="7500" />
          </Field>
          <Field label={t("minHours")} error={errors.minHours}>
            <Input inputMode="numeric" value={form.minHours} onChange={set("minHours")} />
          </Field>
          <Field label={t("transport")} error={errors.transportCharge}>
            <Input inputMode="numeric" value={form.transportCharge} onChange={set("transportCharge")} />
          </Field>
        </div>
        <label className="flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3">
          <input type="checkbox" className="h-5 w-5 accent-brand-500" checked={fuelIncluded} onChange={(e) => setFuelIncluded(e.target.checked)} />
          <span className="font-medium">{t("fuel")}</span>
        </label>
        <Field label={t("description")}>
          <Textarea value={form.description} onChange={set("description")} />
        </Field>
      </Card>

      {initial && <p className="text-sm text-stone-500">{t("reviewNote")}</p>}
      {error && <Alert tone="red">{error}</Alert>}
      <Button type="submit" size="lg" full loading={busy}>
        {t("submit")}
      </Button>
    </form>
  );
}
