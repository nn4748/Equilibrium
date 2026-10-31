"use client";

import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";
import { cn } from "@/lib/cn";

interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
  tone?: "default" | "error";
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id">, duration?: number) => void;
  dismiss: (id: number) => void;
}

let next = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  show: (toast, duration = 4500) => {
    const id = next++;
    set({ toasts: [...get().toasts.slice(-1), { ...toast, id }] });
    window.setTimeout(() => get().dismiss(id), duration);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (message: string, options: Omit<Toast, "id" | "message"> = {}) => useToasts.getState().show({ message, ...options });

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-4 border bg-bg-raised py-2.5 pl-4 pr-2 shadow-layer",
              t.tone === "error" ? "border-fg" : "border-line",
            )}
          >
            <p className="flex-1 text-[14px] text-fg">{t.message}</p>
            {t.action ? (
              <button
                type="button"
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
                className="label-tech h-9 shrink-0 px-3 text-fg-strong underline decoration-line underline-offset-4 hover:decoration-fg"
              >
                {t.action.label}
              </button>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
