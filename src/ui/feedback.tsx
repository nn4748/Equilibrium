import { cn } from "@/lib/cn";
import { CornerMarks, Label } from "./typography";

/** Loading placeholder. Hairline outline with a slow luminance scan. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative overflow-hidden bg-surface", className)}>
      <div
        className="absolute inset-0 motion-reduce:hidden"
        style={{
          background: "linear-gradient(90deg, transparent, var(--surface-2), transparent)",
          animation: "eq-scan 1.8s var(--ease-precise) infinite",
        }}
      />
    </div>
  );
}

/**
 * Empty state drawn as an unbuilt bay: a dashed frame with registration
 * marks, a reference code and an optional action.
 */
export function EmptyState({
  code,
  title,
  children,
  action,
  className,
}: {
  code: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative flex flex-col items-start gap-5 p-8 sm:p-12", className)}>
      <CornerMarks />
      <svg aria-hidden viewBox="0 0 120 48" className="w-28 text-line">
        <path d="M2 46h116M2 46 22 6h76l20 40M22 6l18 40 20-40 20 40 18-40" fill="none" stroke="currentColor" strokeDasharray="3 3" />
        <circle cx="2" cy="46" r="1.5" fill="currentColor" />
        <circle cx="118" cy="46" r="1.5" fill="currentColor" />
      </svg>
      <Label>{code}</Label>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-heading font-medium text-fg">{title}</h2>
        {children ? <div className="text-muted-strong">{children}</div> : null}
      </div>
      {action}
    </section>
  );
}
