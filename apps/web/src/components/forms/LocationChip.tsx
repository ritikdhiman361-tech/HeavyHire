"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BENGALURU, getSavedPlace, savePlace, type Place } from "@/lib/location";
import { classNames } from "@/lib/format";
import { PlaceSearch } from "./PlaceSearch";

/** "📍 Near Whitefield · Change" — the location used to find nearby machines. */
export function LocationChip({ dark, onChange }: { dark?: boolean; onChange?: (p: Place) => void }) {
  const t = useTranslations("home");
  const [place, setPlace] = useState<Place>(BENGALURU);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = getSavedPlace();
    if (saved) setPlace(saved);
  }, []);

  function pick(p: Place) {
    savePlace(p);
    setPlace(p);
    setOpen(false);
    onChange?.(p);
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={classNames(
          "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left",
          dark ? "bg-white/10 text-white" : "bg-white ring-1 ring-stone-200",
        )}
      >
        <span>
          📍 {t("near")} <strong>{place.label}</strong>
        </span>
        <span className={classNames("text-sm font-semibold", dark ? "text-brand-400" : "text-brand-700")}>{t("change")}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-xl bg-white p-3 text-ink shadow-lg ring-1 ring-stone-200">
          <PlaceSearch onPick={pick} />
        </div>
      )}
    </div>
  );
}
