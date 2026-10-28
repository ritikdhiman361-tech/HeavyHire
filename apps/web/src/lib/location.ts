// The renter's chosen location (for "machines near you"), saved in the browser.

export interface Place {
  lat: number;
  lng: number;
  label: string;
}

export const BENGALURU: Place = { lat: 12.9716, lng: 77.5946, label: "Bengaluru" };
const KEY = "hh_location";

export function getSavedPlace(): Place | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

export function savePlace(place: Place) {
  localStorage.setItem(KEY, JSON.stringify(place));
}

/** Asks the phone for its GPS location. */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location is not supported on this device"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Please allow location access")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

// ---- Google Maps (optional) ----------------------------------------------------

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
export const hasMaps = Boolean(MAPS_KEY);
let mapsPromise: Promise<void> | null = null;

/** Loads the Google Maps script once (only if a key is set). */
export function loadGoogleMaps(): Promise<void> {
  if (!MAPS_KEY) return Promise.reject(new Error("No Google Maps key"));
  if (typeof window !== "undefined" && window.google?.maps?.places) return Promise.resolve();
  mapsPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&region=IN`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsPromise;
}
