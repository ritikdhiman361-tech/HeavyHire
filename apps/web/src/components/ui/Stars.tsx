import { classNames } from "@/lib/format";

/** Shows ★★★★☆ for a rating. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={classNames("text-brand-500", className)} aria-label={`${value} out of 5`}>
      {"★".repeat(Math.round(value))}
      <span className="text-stone-300">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

/** Tap a star to choose 1–5. */
export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={classNames("text-4xl transition", n <= value ? "text-brand-500" : "text-stone-300")}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
