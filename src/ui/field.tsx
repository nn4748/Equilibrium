import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";
import { Label } from "./typography";

const control =
  "w-full rounded-xs border border-line bg-bg-raised px-3.5 text-[15px] text-fg " +
  "transition-[border-color,background-color] duration-200 ease-precise " +
  "hover:border-muted focus:border-fg focus:bg-surface focus:outline-none " +
  "aria-[invalid=true]:border-fg aria-[invalid=true]:border-dashed disabled:opacity-50";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** Right-aligned technical annotation, e.g. a character count. */
  meta?: React.ReactNode;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}

/** Label + control + hint/error, wired up for assistive tech. */
export function Field({ label, hint, error, meta, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Label as="div">
          <label htmlFor={id}>{label}</label>
        </Label>
        {meta ? <Label as="div">{meta}</Label> : null}
      </div>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="font-mono text-[12px] text-fg">
          <span aria-hidden>! </span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted-strong">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(control, "resize-y py-3 leading-relaxed", className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg aria-hidden viewBox="0 0 10 6" className="pointer-events-none absolute right-3.5 top-1/2 w-2.5 -translate-y-1/2 text-muted-strong">
        <path d="M0.5 0.5 5 5l4.5-4.5" fill="none" stroke="currentColor" />
      </svg>
    </div>
  );
});
