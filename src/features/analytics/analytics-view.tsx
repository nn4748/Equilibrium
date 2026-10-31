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
import { addDays } from "@/domain/dates";
import { cn } from "@/lib/cn";
import { useActiveHabits, useHistory } from "@/state/derived";
import { useData } from "@/state/store";
import { EmptyState } from "@/ui/feedback";
import { Page, PageHeader } from "@/ui/page";
import { BarChart, LineChart, RankBars, type Datum } from "./charts";
import { formatDate, monthName, t, weekdayName } from "@/i18n";

function Panel({ title, note, className, children }: { title: string; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-5 bg-bg p-5 md:p-7", className)}>
      <header className="flex flex-col gap-1.5">
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
      label: formatDate(d.date, { day: "numeric", month: "short" }),
      value: d.score,
      detail: d.score === null ? t("nothing planned") : t("score {n}%", { n: Math.round(d.score) }),
    }));
    const weeks: Datum[] = weeklyScores(history, 12, weekStartsOn).map((w) => ({
      label: formatDate(w.start, { day: "numeric", month: "short" }),
      value: w.score,
      detail: w.score === null ? t("no data") : t("average {n}% · {done} of {total} done", { n: pct(w.score), done: w.completed, total: w.scheduled }),
    }));
    const months: Datum[] = monthlyScores(history, 12).map((m) => ({
      label: monthName(Number(m.start.slice(5, 7)) - 1, "short"),
      value: m.score,
      detail: m.score === null ? t("no data") : t("average {n}% · {done} done", { n: pct(m.score), done: m.completed }),
    }));
    const perf = habitPerformance(habits, logs, today, weekStartsOn, 30, 8);
    const hours = hourDistribution(logs, addDays(today, -89));
    const hourMax = Math.max(1, ...hours);
    const byHour: Datum[] = hours.map((n, h) => ({ label: String(h).padStart(2, "0"), value: n, detail: t("{n} done between {h}:00 and {h}:59", { n, h: String(h).padStart(2, "0") }) }));
    const peak = hours.indexOf(Math.max(...hours));
    const order = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const wd = weekdayDistribution(history);
    const byWeekday: Datum[] = order.map((d) => {
      const r = wd[d]!;
      return { label: weekdayName(d, "short"), value: r.rate === null ? null : r.rate * 100, detail: r.rate === null ? t("no data") : t("{pct}% done · {done} of {total}", { pct: Math.round(r.rate * 100), done: r.completed, total: r.due }) };
    });
    const bandLabels = ["0–19", "20–39", "40–59", "60–79", "80–99", "100"];
    const bands = scoreBands(history);
    const bandMax = Math.max(1, ...bands);
    const byBand: Datum[] = bands.map((n, i) => ({ label: bandLabels[i]!, value: n, detail: t("{n} days scored {range}", { n, range: bandLabels[i]! }) }));
    const categories = categoryShare(habits, logs, addDays(today, -29));
    return { series, weeks, months, perf, byHour, hourMax, peak, hours, byWeekday, byBand, bandMax, categories };
  }, [history, habits, logs, today, weekStartsOn]);

  if (tracked < 3) {
    return (
      <Page>
        <PageHeader title={t("Stats")} />
        <EmptyState title={t("Not enough data yet")}>
          {t("Charts show up after 3 days of use.")} {tracked > 0 ? t("You have {n} so far.", { n: tracked }) : t("Check off today's habits to start.")}
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
      <PageHeader title={t("Stats")} subtitle={t("Based on {n} days", { n: tracked })} />

      <div className="grid gap-px border border-line bg-line lg:grid-cols-2">
        <Panel title={t("Your score, day by day")} note={t("The last 90 days. The thick line is the weekly average.")} className="lg:col-span-2">
          <LineChart data={data.series} label={t("Daily score, last 90 days")} fallback={t("Tap or hover over the chart to see a day.")} />
        </Panel>

        <Panel title={t("Week by week")} note={t("Your average score each week.")}>
          <BarChart data={data.weeks} label={t("Average score each week")} fallback={t("Average score, by week")} labelEvery={3} />
        </Panel>

        <Panel title={t("Month by month")} note={t("Your average score each month.")}>
          <BarChart data={data.months} label={t("Average score each month")} fallback={t("Average score, by month")} labelEvery={2} />
        </Panel>

        <Panel title={t("Going well")} note={t("Habits you did most in the last 30 days.")}>
          {strongest.length ? (
            <RankBars rows={strongest.map((p) => ({ id: p.habit.id, label: p.habit.title, rate: p.rate, note: t("Done {done} of {total} times", { done: p.completed, total: p.due }) }))} />
          ) : (
            <p className="text-[14px] text-muted-strong">{t("Nothing was planned in the last 30 days.")}</p>
          )}
        </Panel>

        <Panel title={t("Needs work")} note={t("Habits you missed most in the last 30 days.")}>
          {weakest.length ? (
            <RankBars rows={weakest.map((p) => ({ id: p.habit.id, label: p.habit.title, rate: p.rate, note: t("Missed {n} of {total} times", { n: p.due - p.completed, total: p.due }) }))} />
          ) : (
            <p className="text-[14px] text-muted-strong">{t("Add a few more habits to compare.")}</p>
          )}
        </Panel>

        <Panel title={t("Each habit, week by week")} note={t("How much of each habit you did in the last 8 weeks. Brighter means more.")} className="lg:col-span-2">
          {data.perf.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className="label-tech pb-3 text-left font-normal text-muted-strong">
                      {t("Habit")}
                    </th>
                    {Array.from({ length: 8 }, (_, i) => (
                      <th key={i} scope="col" className="label-tech pb-3 text-center font-normal text-muted-strong">
                        {i === 7 ? t("This wk") : t("{n}w ago", { n: 7 - i })}
                      </th>
                    ))}
                    <th scope="col" className="label-tech pb-3 text-right font-normal text-muted-strong">
                      {t("30d")}
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
                              title={w === null ? t("Not planned") : `${Math.round(w * 100)}%`}
                              className="mx-auto block h-5 w-full max-w-10"
                              style={{ background: lvl === null ? "transparent" : `var(--heat-${lvl})`, border: lvl === null ? "1px dashed var(--line)" : undefined }}
                            >
                              <span className="sr-only">{w === null ? t("Not planned") : `${Math.round(w * 100)}%`}</span>
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-4 text-right tabular-nums text-[13px] font-tabular text-fg">{Math.round(p.rate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[14px] text-muted-strong">{t("Nothing was planned in the last 8 weeks.")}</p>
          )}
        </Panel>

        <Panel title={t("Time of day")} note={totalCompletions ? t("When you usually finish habits. Most often around {h}:00.", { h: String(data.peak).padStart(2, "0") }) : t("When you usually finish habits.")}>
          <BarChart
            data={data.byHour}
            max={data.hourMax}
            ticks={[0, data.hourMax]}
            label={t("Completions by hour of day, last 90 days")}
            fallback={t("{n} habits done in the last 90 days", { n: totalCompletions })}
            labelEvery={6}
          />
        </Panel>

        <Panel title={t("Day of the week")} note={t("Which days go best for you.")}>
          <BarChart data={data.byWeekday} label={t("Share done, by day of the week")} fallback={t("Share done, by day of the week")} format={(v) => `${v}%`} />
        </Panel>

        <Panel title={t("How your days went")} note={t("How many days scored in each range.")}>
          <BarChart data={data.byBand} max={data.bandMax} ticks={[0, data.bandMax]} label={t("Number of days in each score range")} fallback={t("Number of days in each score range")} />
        </Panel>

        <Panel title={t("By category")} note={t("Habits done in each category, last 30 days.")}>
          {categoryTotal ? (
            <RankBars rows={data.categories.map((c) => ({ id: c.category, label: t(c.category), rate: c.count / categoryTotal, note: t("{n} done", { n: c.count }) }))} />
          ) : (
            <p className="text-[14px] text-muted-strong">{t("Nothing done in the last 30 days.")}</p>
          )}
        </Panel>
      </div>
    </Page>
  );
}
