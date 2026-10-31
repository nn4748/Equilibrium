"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Ellipsis, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUI } from "@/state/ui-store";
import { IconButton } from "@/ui/button";
import { Sheet } from "@/ui/overlay";
import { MOBILE_PRIMARY, NAV, navFor } from "./nav";
import { DateReadout, ThemeToggle, Wordmark } from "./parts";

const primary = MOBILE_PRIMARY.map((href) => NAV.find((n) => n.href === href)!);
const secondary = NAV.filter((n) => !(MOBILE_PRIMARY as readonly string[]).includes(n.href));

/** Top bar on phones. */
export function MobileTopBar({ className }: { className?: string }) {
  const openPalette = useUI((s) => s.setPaletteOpen);
  return (
    <header className={cn("sticky top-0 z-30 border-b border-line bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md", className)}>
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Wordmark />
        <div className="flex items-center gap-1">
          <DateReadout className="mr-2 hidden xs:flex" />
          <IconButton label="Search" onClick={() => openPalette(true)}>
            <Search className="size-4" strokeWidth={1.5} />
          </IconButton>
          <ThemeToggle className="-mr-2" />
        </div>
      </div>
    </header>
  );
}

/** Bottom navigation: four primary sections plus a "More" sheet. */
export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = navFor(pathname)?.href;
  const moreOpen = useUI((s) => s.moreOpen);
  const setMoreOpen = useUI((s) => s.setMoreOpen);
  const secondaryActive = secondary.some((n) => n.href === active);

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn("safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-md", className)}
      >
        <ul className="grid grid-cols-5">
          {primary.map((item) => {
            const isActive = item.href === active;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex h-16 flex-col items-center justify-center gap-1.5 transition-colors duration-200",
                    isActive ? "text-fg-strong" : "text-muted-strong active:text-fg",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="bottom-active"
                      aria-hidden
                      className="absolute inset-x-5 top-0 h-px bg-fg-strong"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                  <Icon className="size-[18px]" strokeWidth={isActive ? 1.75 : 1.25} aria-hidden />
                  <span className="text-[12px] font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className={cn(
                "relative flex h-16 w-full flex-col items-center justify-center gap-1.5 transition-colors duration-200",
                secondaryActive ? "text-fg-strong" : "text-muted-strong active:text-fg",
              )}
            >
              {secondaryActive ? <span aria-hidden className="absolute inset-x-5 top-0 h-px bg-fg-strong" /> : null}
              <Ellipsis className="size-[18px]" strokeWidth={1.25} aria-hidden />
              <span className="text-[12px] font-medium">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <ul className="-mx-6 -mt-6">
          {secondary.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === active;
            return (
              <li key={item.href} className="border-b border-line">
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className="flex min-h-16 items-center gap-4 px-6 py-3 transition-colors active:bg-surface"
                >
                  <span className="flex flex-1 flex-col">
                    <span className={cn("text-[16px]", isActive ? "text-fg-strong" : "text-fg")}>{item.label}</span>
                    <span className="text-[13px] text-muted-strong">{item.hint}</span>
                  </span>
                  <Icon className="size-4 text-muted-strong" strokeWidth={1.5} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
