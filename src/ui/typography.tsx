import { cn } from "@/lib/cn";

type Tone = "muted" | "strong" | "fg";

const toneClass: Record<Tone, string> = {
  muted: "text-muted-strong",
  strong: "text-fg-strong",
  fg: "text-fg",
};

/** Small secondary label. */
export function Label({
  as: Tag = "span",
  tone = "muted",
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "span" | "p" | "div" | "dt" | "h2" | "h3"; tone?: Tone }) {
  return <Tag className={cn("label-tech", toneClass[tone], className)} {...props} />;
}

/** Numeric readout with tabular figures. */
export function Data({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("tabular-nums text-data font-tabular", className)} {...props} />;
}

/** "02 — TODAY" style section index. */
export function SectionIndex({ index, children, className }: { index: number | string; children: React.ReactNode; className?: string }) {
  const n = typeof index === "number" ? String(index).padStart(2, "0") : index;
  return (
    <Label as="div" className={cn("flex items-center gap-3", className)}>
      <span className="text-fg">{n}</span>
      <span aria-hidden className="h-px w-6 bg-line" />
      <span>{children}</span>
    </Label>
  );
}

/** Hairline divider. Optional label sits on the rule like a drawing callout. */
export function Rule({ label, className, vertical }: { label?: string; className?: string; vertical?: boolean }) {
  if (vertical) return <span aria-hidden className={cn("w-px self-stretch bg-line", className)} />;
  if (!label) return <hr className={cn("border-0 h-px bg-line", className)} />;
  return (
    <div role="separator" className={cn("flex items-center gap-3", className)}>
      <span aria-hidden className="h-px w-3 bg-line" />
      <Label>{label}</Label>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}

/**
 * Measurement ticks — a ruler. `count` minor divisions, a major tick every
 * `major`. Purely decorative; hidden from assistive tech.
 */
export function Ticks({
  count = 40,
  major = 10,
  className,
  orientation = "horizontal",
}: {
  count?: number;
  major?: number;
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  const horizontal = orientation === "horizontal";
  return (
    <div
      aria-hidden
      className={cn("flex justify-between text-line", horizontal ? "h-2 items-end" : "w-2 flex-col items-end", className)}
    >
      {Array.from({ length: count + 1 }, (_, i) => {
        const isMajor = i % major === 0;
        return (
          <span
            key={i}
            className={cn("bg-current", horizontal ? "w-px" : "h-px", isMajor ? (horizontal ? "h-2" : "w-2") : horizontal ? "h-1" : "w-1")}
            style={isMajor ? { color: "var(--muted)" } : undefined}
          />
        );
      })}
    </div>
  );
}

/** Corner registration marks, framing a region like a drawing sheet. */
export function CornerMarks({ className }: { className?: string }) {
  const base = "absolute size-2.5 border-muted";
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(base, "left-0 top-0 border-l border-t")} />
      <span className={cn(base, "right-0 top-0 border-r border-t")} />
      <span className={cn(base, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(base, "bottom-0 right-0 border-b border-r")} />
    </span>
  );
}

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn("inline-flex h-5 min-w-5 items-center justify-center border border-line px-1 tabular-nums text-[12px] text-muted-strong", className)}
      {...props}
    />
  );
}
