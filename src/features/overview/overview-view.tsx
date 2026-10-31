"use client";

import { ArrowRight } from "lucide-react";
import { formatKey } from "@/domain/dates";
import { averageScore } from "@/domain/scoring";
import { balanceStreaks } from "@/domain/streaks";
import { BalanceGauge } from "@/features/metrics/balance-gauge";
import { LoadBar } from "@/features/metrics/load-bar";
import { useActiveHabits, useDay, useHistory, useStructure } from "@/state/derived";
import { useData } from "@/state/store";
import { StructureView } from "@/three/structure-view";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/feedback";
import { Page, PageHeader } from "@/ui/page";
import { Label } from "@/ui/typography";
import { Heatmap } from "./heatmap";
import { HabitRuns } from "./habit-runs";
import { MonthCalendar } from "./month-calendar";

function Stat({ label, value, unit, note }: { label: string; value: string | number; unit?: string; note?: string }) {
  return (
    <div className="flex flex-col gap-2 bg-bg p-5 md:p-6">
      <Label>{label}</Label>
      <p className="tabular-nums text-[2.25rem] leading-none tracking-[-0.02em] text-fg-strong font-tabular">
        {value}
        {unit ? <span className="ml-1.5 text-[13px] tracking-normal text-muted-strong">{unit}</span> : null}
      </p>
      {note ? <p className="text-[12px] text-muted-strong">{note}</p> : null}
    </div>
  );
}

export function OverviewView() {
  const active = useActiveHabits();
  const history = useHistory();
  const structure = useStructure();
  const { entries, metrics } = useDay();
  const today = useData((s) => s.today);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);

  if (active.length === 0 && !history.start) {
    return (
      <Page>
        <PageHeader title="Progress" />
        <EmptyState title="Nothing to show yet." action={<ButtonLink href="/habits">Add habits</ButtonLink>}>
          Add a habit and your progress will show up here.
        </EmptyState>
      </Page>
    );
  }

  const streaks = balanceStreaks(history);
  const week = averageScore(history, today, 7);
  const month = averageScore(history, today, 30);

  return (
    <Page>
      <PageHeader
        title="Progress"
        subtitle={history.start ? `Tracking since ${formatKey(history.start, { day: "numeric", month: "short", year: "numeric" })}` : undefined}
        actions={
          <ButtonLink href="/today" variant="secondary">
            Go to Today <ArrowRight className="size-4" strokeWidth={1.5} />
          </ButtonLink>
        }
      />

      <div className="grid gap-px border border-line bg-line lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative bg-bg">
          <StructureView
            members={structure.members}
            stress={structure.stress}
            equilibrium={structure.equilibrium}
            label={`Bridge with ${structure.members.length} beams, one for each habit.`}
            className="h-[280px] sm:h-[380px] lg:h-[480px]"
          />
          <p className="pointer-events-none absolute left-4 top-4 text-[13px] text-muted-strong">
            {structure.members.length} habits · {structure.equilibrium ? "all done today" : "your bridge"}
          </p>
        </div>
        <div className="flex flex-col justify-between gap-8 bg-bg p-5 md:p-6">
          <BalanceGauge today={metrics.balanceScore} week={week} month={month} />
          <LoadBar entries={entries} />
        </div>
      </div>

      <div className="mt-px grid grid-cols-2 gap-px border-x border-b border-line bg-line md:grid-cols-4">
        <Stat label="Current streak" value={streaks.current} unit={streaks.current === 1 ? "day" : "days"} note="Days in a row with everything done" />
        <Stat
          label="Longest streak"
          value={streaks.longest}
          unit={streaks.longest === 1 ? "day" : "days"}
          note={streaks.longestEnd ? `Ended ${formatKey(streaks.longestEnd, { day: "numeric", month: "short" })}` : "No perfect days yet"}
        />
        <Stat label="Last 7 days" value={week === null ? "—" : `${Math.round(week)}%`} note="Average score" />
        <Stat label="Last 30 days" value={month === null ? "—" : `${Math.round(month)}%`} note="Average score" />
      </div>

      <section aria-labelledby="year" className="mt-16">
        <h2 id="year" className="mb-1 text-heading font-semibold text-fg-strong">
          Your year
        </h2>
        <p className="mb-6 text-[14px] text-muted-strong">Each square is a day. Darker means less done; brighter means more.</p>
        <Heatmap history={history} weekStartsOn={weekStartsOn} />
      </section>

      <section aria-labelledby="month" className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <h2 id="month" className="mb-6 text-heading font-semibold text-fg-strong">
            This month
          </h2>
          <MonthCalendar history={history} weekStartsOn={weekStartsOn} />
        </div>
        <div>
          <h2 className="mb-6 text-heading font-semibold text-fg-strong">Each habit</h2>
          <HabitRuns />
        </div>
      </section>
    </Page>
  );
}
