"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUI } from "@/state/ui-store";
import { IconButton } from "@/ui/button";
import { Kbd } from "@/ui/typography";
import { NAV, navFor } from "./nav";
import { DateReadout, ThemeToggle, Wordmark } from "./parts";

/** Sidebar for tablet and desktop. Collapses to a rail of section numbers. */
export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = navFor(pathname)?.href;
  const collapsed = useUI((s) => s.sidebarCollapsed);
  const toggle = useUI((s) => s.toggleSidebar);
  const openPalette = useUI((s) => s.setPaletteOpen);

  return (
    <aside
      aria-label="Primary"
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 h-dvh shrink-0 flex-col border-r border-line bg-bg transition-[width] duration-300 ease-precise",
        collapsed ? "w-[72px]" : "w-[248px]",
        className,
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-line", collapsed ? "justify-center" : "px-6")}>
        <Wordmark compact={collapsed} />
      </div>

      <div className={cn("pt-4", collapsed ? "flex justify-center" : "px-4")}>
        {collapsed ? (
          <IconButton label="Search (⌘K)" onClick={() => openPalette(true)}>
            <Search className="size-4" strokeWidth={1.5} />
          </IconButton>
        ) : (
          <button
            type="button"
            onClick={() => openPalette(true)}
            className="flex h-10 w-full items-center gap-3 border border-line px-3 text-[13px] text-muted-strong transition-colors hover:border-muted hover:text-fg"
          >
            <Search className="size-4" strokeWidth={1.5} aria-hidden />
            <span className="flex-1 text-left">Search</span>
            <Kbd>⌘K</Kbd>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="flex flex-col">
          {NAV.map((item) => {
            const isActive = item.href === active;
            const n = String(item.index).padStart(2, "0");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex h-11 items-center transition-colors duration-200",
                    collapsed ? "justify-center" : "gap-4 px-6",
                    isActive ? "text-fg-strong" : "text-muted-strong hover:text-fg",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="sidebar-active"
                      aria-hidden
                      className="absolute inset-y-2 left-0 w-px bg-fg-strong"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                  <span className="font-mono text-[11px] font-tabular">{n}</span>
                  {!collapsed ? (
                    <>
                      <span className="text-[14px] tracking-[-0.01em]">{item.label}</span>
                      <span
                        aria-hidden
                        className={cn(
                          "ml-auto h-px bg-current transition-[width,opacity] duration-300 ease-precise",
                          isActive ? "w-6 opacity-100" : "w-0 opacity-0 group-hover:w-3 group-hover:opacity-60",
                        )}
                      />
                    </>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("flex flex-col gap-4 border-t border-line py-4", collapsed ? "items-center" : "px-6")}>
        {!collapsed ? <DateReadout stacked /> : null}
        <div className={cn("flex items-center", collapsed ? "flex-col gap-1" : "-mx-2 justify-between")}>
          <ThemeToggle />
          <IconButton label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggle} aria-expanded={!collapsed}>
            {collapsed ? <PanelLeftOpen className="size-4" strokeWidth={1.5} /> : <PanelLeftClose className="size-4" strokeWidth={1.5} />}
          </IconButton>
        </div>
      </div>
    </aside>
  );
}
