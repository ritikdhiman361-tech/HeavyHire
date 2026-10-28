"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { classNames } from "@/lib/format";

// Small message at the bottom of the screen: toast("Saved") or toast("Error", "error").

type Tone = "success" | "error";
const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone; id: number } | null>(null);

  const show = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now();
    setToast({ message, tone, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div
            role="status"
            className={classNames(
              "rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg",
              toast.tone === "success" ? "bg-ink" : "bg-red-600",
            )}
          >
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
