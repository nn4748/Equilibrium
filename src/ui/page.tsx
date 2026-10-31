import { cn } from "@/lib/cn";
import { SectionIndex } from "./typography";

export function Page({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 md:px-8 md:pt-10 lg:px-12", className)} {...props} />;
}

/** Section index, title, optional meta and actions. */
export function PageHeader({
  index,
  section,
  title,
  meta,
  actions,
  className,
}: {
  index: number;
  section: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-6 border-b border-line pb-8 md:mb-12 md:pb-10", className)}>
      <div className="flex items-center justify-between gap-4">
        <SectionIndex index={index}>{section}</SectionIndex>
        {meta ? <div className="label-tech text-muted-strong">{meta}</div> : null}
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h1 className="text-display font-medium text-fg-strong">{title}</h1>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
