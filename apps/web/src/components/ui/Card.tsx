import type { HTMLAttributes } from "react";
import { classNames } from "@/lib/format";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={classNames("rounded-2xl border border-stone-200 bg-white p-4", className)} />;
}

export function Badge({ tone = "stone", className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: "stone" | "green" | "yellow" | "red" | "blue" }) {
  const tones = {
    stone: "bg-stone-100 text-stone-700",
    green: "bg-green-100 text-green-800",
    yellow: "bg-brand-100 text-brand-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-800",
  };
  return <span {...rest} className={classNames("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} />;
}

export function Alert({ tone = "yellow", className, ...rest }: HTMLAttributes<HTMLDivElement> & { tone?: "yellow" | "red" | "green" | "blue" }) {
  const tones = {
    yellow: "border-brand-200 bg-brand-50 text-brand-700",
    red: "border-red-200 bg-red-50 text-red-700",
    green: "border-green-200 bg-green-50 text-green-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };
  return <div role="alert" {...rest} className={classNames("rounded-xl border px-4 py-3 text-sm", tones[tone], className)} />;
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">🚧</div>
      <p className="text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 text-stone-500">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert tone="red" className="flex items-center justify-between gap-3">
      <span>{error instanceof Error ? error.message : "Something went wrong"}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline">
          Retry
        </button>
      )}
    </Alert>
  );
}
