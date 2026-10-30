"use client";

import { useEffect } from "react";
import { useUI } from "@/state/ui-store";
import { BottomNav, MobileTopBar } from "./mobile-nav";
import { Sidebar } from "./sidebar";

/**
 * Application frame. Phones get a top bar + bottom navigation; tablet and
 * desktop get the sidebar. The two layouts are separate, not a shrunk copy.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrate = useUI((s) => s.hydrate);
  useEffect(hydrate, [hydrate]);

  return (
    <div className="min-h-dvh md:flex">
      <a
        href="#main"
        className="label-tech fixed left-4 top-4 z-[60] -translate-y-24 bg-fg px-3 py-2 text-bg focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar className="hidden md:flex" />
      <MobileTopBar className="md:hidden" />
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none md:pb-0">
        {children}
      </main>
      <BottomNav className="md:hidden" />
    </div>
  );
}
