import { cn } from "@/lib/cn";

export function Page({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 md:px-8 md:pt-10 lg:px-12", className)} {...props} />;
}

/** Page title, an optional one-line subtitle, and actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between", className)}>
      <div className="flex flex-col gap-2">
        <h1 className="text-title font-semibold text-fg-strong">{title}</h1>
        {subtitle ? <p className="text-[15px] text-muted-strong">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
