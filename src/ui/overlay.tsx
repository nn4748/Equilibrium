"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MQ, useFocusTrap, useHydrated, useMediaQuery, useScrollLock } from "@/lib/hooks";
import { IconButton } from "./button";
import { Label } from "./typography";
import { t } from "@/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Technical reference shown above the title, e.g. "HB-01 / NEW MEMBER". */
  code?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

function Header({ title, code, description, onClose, titleId, descId }: Pick<OverlayProps, "title" | "code" | "description" | "onClose"> & { titleId: string; descId: string }) {
  return (
    <header className="flex items-start justify-between gap-6 border-b border-line px-6 pb-5 pt-6">
      <div className="flex min-w-0 flex-col gap-2">
        {code ? <Label>{code}</Label> : null}
        <h2 id={titleId} className="text-[1.5rem] font-medium leading-none tracking-[-0.02em] text-fg-strong">
          {title}
        </h2>
        {description ? (
          <div id={descId} className="text-[14px] text-muted-strong">
            {description}
          </div>
        ) : null}
      </div>
      <IconButton label={t("Close")} size="sm" onClick={onClose} className="-mr-2 -mt-1">
        <X className="size-4" strokeWidth={1.5} />
      </IconButton>
    </header>
  );
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 bg-scrim backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      onClick={onClose}
    />
  );
}

/* ---------------------------------------------------------------- dialog */

export function Dialog({ open, onClose, title, code, description, children, footer, className }: OverlayProps) {
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const titleId = useId();
  const descId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  useScrollLock(open);
  useEscape(open, onClose);

  if (!hydrated) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <Backdrop onClose={onClose} />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn("relative flex max-h-[90dvh] w-full flex-col bg-bg-raised shadow-layer outline-none sm:max-w-lg", className)}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Header title={title} code={code} description={description} onClose={onClose} titleId={titleId} descId={descId} />
            {children ? <div className="overflow-y-auto px-6 py-6">{children}</div> : null}
            {footer ? <footer className="safe-bottom flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/* ----------------------------------------------------------------- sheet */

/**
 * Bottom sheet on mobile (drag down to dismiss), side panel on tablet and up.
 * Use for editors and secondary navigation.
 */
export function Sheet({ open, onClose, title, code, description, children, footer, className }: OverlayProps) {
  const hydrated = useHydrated();
  const reduce = useReducedMotion();
  const wide = useMediaQuery(MQ.tablet);
  const titleId = useId();
  const descId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const dragControls = useDragControls();
  const draggable = !wide && !reduce;
  useScrollLock(open);
  useEscape(open, onClose);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  if (!hydrated) return null;

  const hidden = reduce ? { opacity: 0 } : wide ? { x: "100%" } : { y: "100%" };
  const shown = reduce ? { opacity: 1 } : wide ? { x: 0 } : { y: 0 };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <Backdrop onClose={onClose} />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              "absolute flex flex-col bg-bg-raised shadow-layer outline-none",
              wide ? "inset-y-0 right-0 w-full max-w-md border-l border-line" : "inset-x-0 bottom-0 max-h-[92dvh] border-t border-line",
              className,
            )}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ duration: 0.45, ease: EASE }}
            drag={draggable ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {/* Drag handle + header form the grab zone; content stays scrollable. */}
            <div
              className={cn(draggable && "touch-none")}
              onPointerDown={draggable ? (e) => dragControls.start(e) : undefined}
            >
              {!wide ? (
                <div aria-hidden className="flex justify-center pt-3">
                  <span className="h-1 w-10 bg-line" />
                </div>
              ) : null}
              <Header title={title} code={code} description={description} onClose={onClose} titleId={titleId} descId={descId} />
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">{children}</div>
            {footer ? <footer className="safe-bottom flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
