import { classNames } from "@/lib/format";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={classNames("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className ?? "h-6 w-6")}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-20 text-brand-600">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
