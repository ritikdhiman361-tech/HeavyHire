import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/format";
import { Spinner } from "./Spinner";

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-brand-500 text-ink hover:bg-brand-400 active:bg-brand-600",
  dark: "bg-ink text-white hover:bg-stone-800",
  outline: "border border-stone-300 bg-white text-ink hover:bg-stone-100",
  ghost: "text-ink hover:bg-stone-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  loading?: boolean;
  full?: boolean;
}

/** Big, easy-to-tap buttons (min 44px high), as recommended for phones. */
export function Button({ variant = "primary", size = "md", loading, full, className, children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" && "min-h-14 px-6 text-lg",
        size === "md" && "min-h-11 px-4 text-base",
        size === "sm" && "min-h-9 px-3 text-sm",
        full && "w-full",
        styles[variant],
        className,
      )}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
