import { formatRupees } from "@heavyhire/shared";

export { formatRupees };

/** "5 Nov, 9:00 am" in India time */
export function formatDateTime(iso: string | Date, locale = "en") {
  return new Date(iso).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Tue, 5 Nov" in India time */
export function formatDate(iso: string | Date, locale = "en") {
  return new Date(iso).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Today's date in India as YYYY-MM-DD (for <input type="date">). */
export function todayIst(offsetDays = 0) {
  const d = new Date(Date.now() + 5.5 * 3_600_000 + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Paise → rupees string for an input field ("" when empty). */
export const paiseToInput = (p: number | null | undefined) => (p ? String(p / 100) : "");

export function classNames(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
