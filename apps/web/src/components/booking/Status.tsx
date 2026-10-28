"use client";

import { useTranslations } from "next-intl";
import type { BookingStatus } from "@heavyhire/shared";
import { classNames } from "@/lib/format";
import { Badge } from "../ui/Card";

const tone: Record<BookingStatus, "stone" | "green" | "yellow" | "red" | "blue"> = {
  PENDING_PAYMENT: "stone",
  REQUESTED: "yellow",
  CONFIRMED: "blue",
  ON_THE_WAY: "blue",
  WORKING: "blue",
  COMPLETED: "green",
  REJECTED: "red",
  EXPIRED: "red",
  CANCELLED: "stone",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations("status");
  return <Badge tone={tone[status]}>{t(status)}</Badge>;
}

const FLOW: BookingStatus[] = ["REQUESTED", "CONFIRMED", "ON_THE_WAY", "WORKING", "COMPLETED"];
const ICONS = ["⏳", "✅", "🚚", "🔧", "🎉"];

/** Booked → On the way → Working → Done, like a delivery tracker. */
export function StatusSteps({ status }: { status: BookingStatus }) {
  const t = useTranslations("status");
  const current = FLOW.indexOf(status);
  if (current < 0) return null; // cancelled / rejected / expired

  return (
    <ol className="flex justify-between">
      {FLOW.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col items-center text-center">
          <div className="flex w-full items-center">
            <div className={classNames("h-1 flex-1", i === 0 ? "invisible" : i <= current ? "bg-brand-500" : "bg-stone-200")} />
            <span
              className={classNames(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
                i <= current ? "bg-brand-500" : "bg-stone-200 grayscale",
                i === current && "ring-4 ring-brand-200",
              )}
            >
              {ICONS[i]}
            </span>
            <div className={classNames("h-1 flex-1", i === FLOW.length - 1 ? "invisible" : i < current ? "bg-brand-500" : "bg-stone-200")} />
          </div>
          <span className={classNames("mt-1 text-[11px] leading-tight", i === current ? "font-bold" : "text-stone-500")}>{t(s)}</span>
        </li>
      ))}
    </ol>
  );
}
