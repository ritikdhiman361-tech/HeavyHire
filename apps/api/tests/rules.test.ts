import { describe, expect, it } from "vitest";
import type { Settings } from "@prisma/client";
import { bookingEnd, refundOnRenterCancel } from "../src/modules/bookings/bookings.service";
import { distanceKm } from "../src/utils/geo";
import { istDayStart, istStartOfDay } from "../src/utils/time";

const settings = { freeCancelHoursBefore: 24, lateCancelRefundPercent: 50 } as Settings;
const now = new Date("2026-11-01T10:00:00+05:30");

describe("refund when the renter cancels", () => {
  it("full refund while waiting for the vendor", () => {
    expect(refundOnRenterCancel({ status: "REQUESTED", startAt: new Date("2026-11-01T12:00:00+05:30") }, 10000, settings, now)).toBe(10000);
  });
  it("full refund when confirmed and more than 24 hours away", () => {
    expect(refundOnRenterCancel({ status: "CONFIRMED", startAt: new Date("2026-11-03T10:00:00+05:30") }, 10000, settings, now)).toBe(10000);
  });
  it("half refund when confirmed and less than 24 hours away", () => {
    expect(refundOnRenterCancel({ status: "CONFIRMED", startAt: new Date("2026-11-01T20:00:00+05:30") }, 10000, settings, now)).toBe(5000);
  });
});

describe("booking time", () => {
  it("hourly booking ends after the hours", () => {
    expect(bookingEnd(new Date("2026-11-10T09:00:00+05:30"), "HOUR", 8).toISOString()).toBe("2026-11-10T11:30:00.000Z");
  });
  it("daily booking blocks whole days", () => {
    expect(bookingEnd(new Date("2026-11-10T08:00:00+05:30"), "DAY", 2).toISOString()).toBe("2026-11-12T02:30:00.000Z");
  });
});

describe("India time helpers", () => {
  it("a day starts at midnight IST", () => {
    expect(istDayStart("2026-11-05").toISOString()).toBe("2026-11-04T18:30:00.000Z");
    expect(istStartOfDay(new Date("2026-11-05T01:00:00+05:30")).toISOString()).toBe("2026-11-04T18:30:00.000Z");
  });
});

describe("distance", () => {
  it("Whitefield to MG Road is about 15 km", () => {
    const km = distanceKm(12.9698, 77.75, 12.9756, 77.6066);
    expect(km).toBeGreaterThan(14);
    expect(km).toBeLessThan(17);
  });
});
