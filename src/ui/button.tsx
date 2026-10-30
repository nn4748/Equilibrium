import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-fg text-bg border border-fg hover:bg-fg-strong hover:border-fg-strong disabled:bg-surface-2 disabled:border-line disabled:text-muted",
  secondary:
    "bg-transparent text-fg border border-line hover:border-fg disabled:text-muted disabled:border-line-faint",
  ghost: "bg-transparent text-muted-strong border border-transparent hover:text-fg hover:bg-surface disabled:text-muted",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 gap-2 text-[13px]",
  md: "h-11 px-5 gap-2.5 text-sm",
  lg: "h-14 px-7 gap-3 text-[15px]",
};

const base =
  "group/button relative inline-flex select-none items-center justify-center whitespace-nowrap font-medium tracking-[-0.01em] " +
  "transition-[background-color,border-color,color,transform] duration-200 ease-precise active:scale-[0.98] disabled:active:scale-100";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variantClass[variant], sizeClass[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});

type ButtonLinkProps = React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "sm" | "md" | "lg";
};

const iconSize = { sm: "size-8", md: "size-10", lg: "size-12" } as const;

/** Square icon-only button. `label` is required and becomes the accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", className, type = "button", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-transparent text-muted-strong",
        "transition-[color,background-color,border-color,transform] duration-200 ease-precise",
        "hover:text-fg hover:border-line active:scale-95 disabled:text-muted disabled:hover:border-transparent",
        iconSize[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
