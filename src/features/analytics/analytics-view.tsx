"use client";

import { useMemo } from "react";
import {
  categoryShare,
  habitPerformance,
  hourDistribution,
  monthlyScores,
  scoreBands,
  scoreSeries,
  trackedDays,
  weekdayDistribution,
  weeklyScores,
} from "@/domain/analytics";
import { addDays, formatKey, WEEKDAY_SHORT } from "@/domain/dates";
import { cn } from "@/lib/cn";
import { useActiveHabits, useHistory } from "@/state/derived";
import { useData } from "@/state/store";
import { EmptyState } from "@/ui/feedback";
import { Page, PageHeader } from "@/ui/page";
import { Label } from "@/ui/typography";
import { BarChart, LineChart, RankBars, type Datum } from "./charts";

function Panel({ index, title, note, className, children }: { index: string; title: string; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-5 bg-bg p-5 md:p-7", className)}>
      <header className="flex flex-col gap-1.5">
        <Label>{index}</Label>
        <h2 className="text-heading font-medium text-fg-strong">{title}</h2>
        {note ? <p className="text-[13px] text-muted-strong">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

const pct = (v: number | null) => (v === null ? "no data" : `${Math.round(v)}`);

export function AnalyticsView() {
  const history = useHistory();
  const habits = useActiveHabits();
  const logs = useData((s) => s.logs);
  const today = useData((s) => s.today);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);
  const tracked = trackedDays(history);

  const data = useMemo(() => {
    // Today is still in progress, so the history line ends yesterday.
    const series: Datum[] = scoreSeries(history, 91).filter((d) => d.date < today).map((d) => ({
      label: formatKey(d.date, { day: "numeric", month: "short" }),
      value: d.score,
      detail: d.score === null ? "nothing scheduled" : `balance ${Math.round(d.score)}`,
    }));
    const weeks: Datum[] = weeklyScores(history, 12, weekStartsOn).map((w) => ({
      label: formatKey(w.start, { day: "numeric", month: "short" }).replace(" ", " "),
      value: w.score,
      detail: w.score === null ? "no data" : `average ${pct(w.score)} · ${w.completed}/${w.scheduled} done`,
    }));
    const months: Datum[] = monthlyScores(history, 12).map((m) => ({
      label: m.label,
      value: m.score,
      detail: m.score === null ? "no data" : `average ${pct(m.score)} · ${m.completed} completions`,
    }));
    const perf = habitPerformance(habits, logs, today, weekStartsOn, 30, 8);
    const hours = hourDistribution(logs, addDays(today, -89));
    const hourMax = Math.max(1, ...hours);
    const byHour: Datum[] = hours.map((n, h) => ({ label: String(h).padStart(2, "0"), value: n, detail: `${n} completion${n === 1 ? "" : "s"} between ${String(h).padStart(2, "0")}:00 and ${String(h).padStart(2, "0")}:59` }));
    const peak = hours.indexOf(Math.max(...hours));
    const order = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const wd = weekdayDistribution(history);
    const byWeekday: Datum[] = order.map((d) => {
      const r = wd[d]!;
      return { label: WEEKDAY_SHORT[d]!, value: r.rate === null ? null : r.rate * 100, detail: r.rate === null ? "no data" : `${Math.round(r.rate * 100)}% · ${r.completed}/${r.due} done` };
    });
    const bandLabels = ["0–19", "20–39", "40–59", "60–79", "80–99", "100"];
    const bands = scoreBands(history);
    const bandMax = Math.max(1, ...bands);
    const byBand: Datum[] = bands.map((n, i) => ({ label: bandLabels[i]!, value: n, detail: `${n} day${n === 1 ? "" : "s"} scored ${bandLabels[i]}` }));
    const categories = categoryShare(habits, logs, addDays(today, -29));
    return { series, weeks, months, perf, byHour, hourMax, peak, hours, byWeekday, byBand, bandMax, categories };
  }, [history, habits, logs, today, weekStartsOn]);

  if (tracked < 3) {
    return (
      <Page>
        <PageHeader index={4} section="Analytics" title="Analytics" />
        <EmptyState title="Not enough data yet.">
          Analytics appear after three days of tracking. {tracked > 0 ? `You have ${tracked} so far.` : "Complete today's habits to begin."}
        </EmptyState>
      </Page>
    );
  }

  const strongest = data.perf.slice(0, 3);
  const weakest = [...data.perf].reverse().slice(0, 3).filter((p) => !strongest.includes(p));
  const totalCompletions = data.hours.reduce((s, n) => s + n, 0);
  const categoryTotal = data.categories.reduce((s, c) => s + c.count, 0);

  return (
    <Page>
      <PageHeader index={4} section="Analytics" title="Analytics" meta={`${tracked} days tracked`} />

      <div className="grid gap-px border border-line bg-line lg:grid-cols-2">
        <Panel index="A" title="Balance history" note="Daily balance over the last 90 days." className="lg:col-span-2">
          <LineChart data={data.series} label="Daily balance score, last 90 days" fallback="Hover or use arrow keys to inspect a day." />
        </Panel>

        <Panel index="B" title="Weekly trend" note="Average balance per week, last 12 weeks.">
          <BarChart data={data.weeks} label="Weekly average balance" fallback="Average balance by week starting" labelEvery={3} />
        </Panel>

        <Panel index="C" title="Monthly performance" note="Average balance per month.">
          <BarChart data={data.months} label="Monthly average balance" fallback="Average balance by month" labelEvery={2} />
        </Panel>

        <Panel index="D" title="Strongest habits" note="Completion rate over the last 30 days.">
          {strongest.length ? (
            <RankBars rows={strongest.map((p) => ({ id: p.habit.id, label: p.habit.title, rate: p.rate, note: `${p.completed} of ${p.due} times` }))} />
          ) : (
            <p className="text-[14px] text-muted-strong">No habits were due in the last 30 days.</p>
          )}
        </Panel>

        <Panel index="E" title="Needs attention" note="Lowest completion rates over the last 30 days.">
          {weakest.length ? (
            <RankBars rows={weakest.map((p) => ({ id: p.habit.id, label: p.habit.title, rate: p.rate, note: `${p.due - p.completed} missed of ${p.due}` }))} />
          ) : (
            <p className="text-[14px] text-muted-strong">Track more than three habits to compare.</p>
          )}
        </Panel>

        <Panel index="F" title="Consistency" note="Weekly completion rate per habit, last 8 weeks." className="lg:col-span-2">
          {data.perf.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className="label-tech pb-3 text-left font-normal text-muted-strong">
                      Habit
                    </th>
                    {Array.from({ length: 8 }, (_, i) => (
                      <th key={i} scope="col" className="label-tech pb-3 text-center font-normal text-muted-strong">
                        {i === 7 ? "Now" : `−${7 - i}w`}
                      </th>
                    ))}
                    <th scope="col" className="label-tech pb-3 text-right font-normal text-muted-strong">
                      30d
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.perf.map((p) => (
                    <tr key={p.habit.id} className="border-t border-line">
                      <th scope="row" className="max-w-[220px] truncate py-2.5 pr-4 text-left text-[14px] font-normal text-fg">
                        {p.habit.title}
                      </th>
                      {p.weekly.map((w, i) => {
                        const lvl = w === null ? null : w >= 1 ? 4 : w >= 0.75 ? 3 : w >= 0.5 ? 2 : w > 0 ? 1 : 0;
                        return (
                          <td key={i} className="px-0.5 py-2.5">
                            <span
                              title={w === null ? "Not due" : `${Math.round(w * 100)}%`}
                              className="mx-auto block h-5 w-full max-w-10"
                              style={{ background: lvl === null ? "transparent" : `var(--heat-${lvl})`, border: lvl === null ? "1px dashed var(--line)" : undefined }}
                            >
                              <span className="sr-only">{w === null ? "not due" : `${Math.round(w * 100)} percent`}</span>
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-4 text-right font-mono text-[13px] font-tabular text-fg">{Math.round(p.rate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[14px] text-muted-strong">No habits were due in the last 8 weeks.</p>
          )}
        </Panel>

        <Panel index="G" title="Time of day" note={totalCompletions ? `When you complete habits. Busiest hour: ${String(data.peak).padStart(2, "0")}:00.` : "When you complete habits."}>
          <BarChart
            data={data.byHour}
            max={data.hourMax}
            ticks={[0, data.hourMax]}
            label="Completions by hour of day, last 90 days"
            fallback={`${totalCompletions} completions, last 90 days`}
            labelEvery={6}
          />
        </Panel>

        <Panel index="H" title="By weekday" note="Share of due habits completed on each day of the week.">
          <BarChart data={data.byWeekday} label="Completion rate by weekday" fallback="Completion rate by weekday" format={(v) => `${v}%`} />
        </Panel>

        <Panel index="I" title="Score distribution" note="How many finished days landed in each balance band.">
          <BarChart data={data.byBand} max={data.bandMax} ticks={[0, data.bandMax]} label="Days per balance score band" fallback="Days per balance band" />
        </Panel>

        <Panel index="J" title="By category" note="Completions per category, last 30 days.">
          {categoryTotal ? (
            <RankBars rows={data.categories.map((c) => ({ id: c.category, label: c.category, rate: c.count / categoryTotal, note: `${c.count} completions` }))} />
          ) : (
            <p className="text-[14px] text-muted-strong">No completions in the last 30 days.</p>
          )}
        </Panel>
      </div>
    </Page>
  );
}
