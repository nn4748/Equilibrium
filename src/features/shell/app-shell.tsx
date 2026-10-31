"use client";

import { usePathname, useRouter } from "next/navigation";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { HabitEditor } from "@/features/habits/habit-editor";
import { CommandPalette } from "@/features/palette/command-palette";
import { useReducedMotionPref } from "@/state/motion-pref";
import { useData } from "@/state/store";
import { useUI } from "@/state/ui-store";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/feedback";
import { Toaster } from "@/ui/toast";
import { Label } from "@/ui/typography";
import { BottomNav, MobileTopBar } from "./mobile-nav";
import { Sidebar } from "./sidebar";

/** Loads local data once per page load and keeps "today" current. */
export function useDataBoot() {
  const init = useData((s) => s.init);
  const refreshToday = useData((s) => s.refreshToday);
  useEffect(() => {
    if (useData.getState().status === "loading") void init();
    const id = window.setInterval(refreshToday, 60_000);
    return () => window.clearInterval(id);
  }, [init, refreshToday]);
}

/** Phones: top bar + bottom navigation. Tablet and up: sidebar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrate = useUI((s) => s.hydrate);
  const reduce = useReducedMotionPref();
  useEffect(hydrate, [hydrate]);
  useDataBoot();

  return (
    <MotionConfig reducedMotion={reduce ? "always" : "never"}>
      <div className="min-h-dvh md:flex">
        <a href="#main" className="label-tech fixed left-4 top-4 z-[60] -translate-y-24 bg-fg px-3 py-2 text-bg focus:translate-y-0">
          Skip to content
        </a>
        <Sidebar className="hidden md:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar className="md:hidden" />
          <StatusBanners />
          <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none md:pb-0">
            <DataGate>{children}</DataGate>
          </main>
        </div>
        <BottomNav className="md:hidden" />
      </div>
      <HabitEditor />
      <CommandPalette />
      <Toaster />
    </MotionConfig>
  );
}

function StatusBanners() {
  const mode = useData((s) => s.mode);
  const saveError = useData((s) => s.saveError);
  const setMode = useData((s) => s.setMode);
  return (
    <>
      {mode === "sample" ? (
        <div className="flex items-center justify-between gap-4 border-b border-line bg-fg px-4 py-2 text-bg md:px-8 lg:px-12">
          <p className="text-[13px]">
            <span className="mr-2 font-semibold">Sample data</span>
            <span className="hidden sm:inline">This is made-up data to try the app. Your own data is safe.</span>
          </p>
          <button type="button" onClick={() => void setMode("live")} className="h-8 shrink-0 text-[13px] font-medium underline underline-offset-4">
            Back to my data
          </button>
        </div>
      ) : null}
      {saveError ? (
        <div role="alert" className="border-b border-fg px-4 py-2 text-[13px] text-fg md:px-8 lg:px-12">
          {saveError}
        </div>
      ) : null}
    </>
  );
}

function DataGate({ children }: { children: React.ReactNode }) {
  const status = useData((s) => s.status);
  const error = useData((s) => s.error);
  const needsOnboarding = useData((s) => s.status === "ready" && !s.settings.onboardingCompleted && s.habits.length === 0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (needsOnboarding && pathname !== "/settings") router.replace("/onboarding");
  }, [needsOnboarding, pathname, router]);

  if (status === "error") return <DataError message={error} />;
  if (status === "loading" || (needsOnboarding && pathname !== "/settings")) return <PageSkeleton />;
  return <>{children}</>;
}

function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto w-full max-w-[1440px] px-4 pt-6 md:px-8 md:pt-10 lg:px-12">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-6 h-14 w-64" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48 md:col-span-2" />
      </div>
    </div>
  );
}

function DataError({ message }: { message: string | null }) {
  const clearAll = useData((s) => s.clearAll);
  const init = useData((s) => s.init);
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-24">
      <Label>Something went wrong</Label>
      <h1 className="text-title font-medium text-fg-strong">We couldn&apos;t load your data.</h1>
      <p className="text-muted-strong">{message}</p>
      <p className="text-[14px] text-muted-strong">
        Starting fresh keeps a copy of the old data aside. Nothing is deleted.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => void init()}>Try again</Button>
        <Button
          variant="secondary"
          onClick={async () => {
            await clearAll();
            await init();
          }}
        >
          Start fresh
        </Button>
      </div>
    </div>
  );
}
