import type { ComponentProps, ReactNode } from "react";
import { classNames } from "@/lib/format";

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

interface FieldProps {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}

/** A label + input + error message, stacked. */
export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="block text-sm font-medium text-stone-700">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-stone-500">{hint}</span>}
      {error && <span className="block text-sm text-red-600">{error}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={classNames(inputClass, className)} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea rows={3} {...rest} className={classNames(inputClass, className)} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select {...rest} className={classNames(inputClass, "appearance-none", className)}>
      {children}
    </select>
  );
}
