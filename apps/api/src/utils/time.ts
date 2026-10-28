// HeavyHire works in India time (IST, UTC+5:30). The database stores UTC.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** "2026-11-05" → the moment that day starts in India. */
export function istDayStart(date: string): Date {
  return new Date(`${date}T00:00:00+05:30`);
}

/** Start of the India-time day that contains `d`. */
export function istStartOfDay(d: Date): Date {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

/** Start of the India-time month that contains `d`. */
export function istStartOfMonth(d: Date): Date {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

export function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60 * 1000);
}

/** "5 Nov, 9:00 am" in India time, for WhatsApp messages. */
export function formatIst(d: Date): string {
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
