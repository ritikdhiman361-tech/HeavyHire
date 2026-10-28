"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BENGALURU_AREAS } from "@/lib/areas";
import { getCurrentPosition, hasMaps, loadGoogleMaps, type Place } from "@/lib/location";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";

/**
 * Lets someone choose a place in 3 ways:
 *   1. "Use my location" (GPS)
 *   2. Type an address (Google Places, if a Maps key is set)
 *   3. Tap a popular area
 */
export function PlaceSearch({ onPick }: { onPick: (place: Place) => void }) {
  const t = useTranslations("location");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Google Places autocomplete on the text box (only when a key is configured).
  useEffect(() => {
    if (!hasMaps || !inputRef.current) return;
    let listener: google.maps.MapsEventListener | undefined;
    loadGoogleMaps()
      .then(() => {
        const ac = new google.maps.places.Autocomplete(inputRef.current!, {
          componentRestrictions: { country: "in" },
          fields: ["geometry", "name", "formatted_address"],
          bounds: new google.maps.LatLngBounds({ lat: 12.7, lng: 77.3 }, { lat: 13.3, lng: 77.9 }),
        });
        listener = ac.addListener("place_changed", () => {
          const p = ac.getPlace();
          const loc = p.geometry?.location;
          if (loc) onPick({ lat: loc.lat(), lng: loc.lng(), label: p.name ?? p.formatted_address ?? "" });
        });
      })
      .catch(() => undefined);
    return () => listener?.remove();
  }, [onPick]);

  async function useGps() {
    setLocating(true);
    setError("");
    try {
      const pos = await getCurrentPosition();
      onPick({ ...pos, label: t("current") });
    } catch {
      setError(t("denied"));
    } finally {
      setLocating(false);
    }
  }

  const areas = BENGALURU_AREAS.filter((a) => a.label.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-3">
      <Button type="button" variant="dark" full onClick={useGps} loading={locating}>
        📍 {locating ? t("locating") : t("useMyLocation")}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Input ref={inputRef} placeholder={t("searchPlaceholder")} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onPick(a)}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-brand-500"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
