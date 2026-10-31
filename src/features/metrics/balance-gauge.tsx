"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { AnimatedNumber } from "@/ui/animated-number";
import { Label } from "@/ui/typography";

const R = 100;
const CX = 120;
const CY = 118;
const START = Math.PI; // 0 → left
const polar = (value: number, r: number) => {
  const a = START - (value / 100) * Math.PI;
  return [CX + Math.cos(a) * r, CY - Math.sin(a) * r] as const;
};

/** Marker for a reference value (weekly / monthly average) on the outer rim. */
function Marker({ value, filled, label }: { value: number; filled: boolean; label: string }) {
  const a = START - (value / 100) * Math.PI;
  const [x, y] = polar(value, R + 9);
  const deg = (-a * 180) / Math.PI + 90;
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`} aria-label={label}>
      <path d="M0 4 L-3.5 -3 L3.5 -3 Z" fill={filled ? "var(--fg)" : "none"} stroke="var(--fg)" strokeWidth={1} />
    </g>
  );
}

/**
 * Balance score as a dial instrument: 0–100 scale with minor ticks every 2,
 * a damped needle for today, and rim markers for the 7- and 30-day averages.
 */
export function BalanceGauge({
  today,
  week,
  month,
  className,
  compact = false,
}: {
  today: number | null;
  week: number | null;
  month: number | null;
  className?: string;
  compact?: boolean;
}) {
  const value = today ?? 0;
  const spring = useSpring(0, { stiffness: 90, damping: 16, mass: 0.8 });
  useEffect(() => spring.set(value), [spring, value]);
  const x2 = useTransform(spring, (v) => polar(v, R - 16)[0]);
  const y2 = useTransform(spring, (v) => polar(v, R - 16)[1]);
  const tx = useTransform(spring, (v) => polar(v, -14)[0]);
  const ty = useTransform(spring, (v) => polar(v, -14)[1]);

  const ticks = Array.from({ length: 51 }, (_, i) => i * 2);
  const fmt = (v: number | null) => (v === null ? "—" : Math.round(v).toString());

  return (
    <figure className={cn("flex flex-col", className)}>
      <svg viewBox="0 0 240 132" className="w-full" role="img" aria-label={`Balance score ${today === null ? "not available" : Math.round(value)} out of 100`}>
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="var(--line)" strokeWidth={1} />
        <path d={`M ${CX - R + 22} ${CY} A ${R - 22} ${R - 22} 0 0 1 ${CX + R - 22} ${CY}`} fill="none" stroke="var(--line-faint)" strokeWidth={1} />
        {ticks.map((t) => {
          const major = t % 10 === 0;
          const [x1, y1] = polar(t, R);
          const [x2_, y2_] = polar(t, R - (major ? 9 : t % 10 === 5 ? 6 : 4));
          const lit = today !== null && t <= value;
          return <line key={t} x1={x1} y1={y1} x2={x2_} y2={y2_} stroke={lit ? "var(--fg)" : "var(--muted)"} strokeOpacity={lit ? 1 : major ? 0.9 : 0.5} strokeWidth={major ? 1.2 : 0.8} />;
        })}
        {[0, 20, 40, 60, 80, 100].map((t) => {
          const [x, y] = polar(t, R - 18);
          return (
            <text key={t} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-strong tabular-nums" fontSize={9}>
              {t}
            </text>
          );
        })}
        {week !== null ? <Marker value={week} filled label={`7-day average ${Math.round(week)}`} /> : null}
        {month !== null ? <Marker value={month} filled={false} label={`30-day average ${Math.round(month)}`} /> : null}
        {today !== null ? (
          <>
            <motion.line x1={tx} y1={ty} x2={x2} y2={y2} stroke="var(--fg-strong)" strokeWidth={1.4} strokeLinecap="square" />
            <circle cx={CX} cy={CY} r={3.5} fill="var(--bg)" stroke="var(--fg-strong)" strokeWidth={1.2} />
          </>
        ) : null}
        <line x1={CX - R - 6} x2={CX + R + 6} y1={CY + 0.5} y2={CY + 0.5} stroke="var(--line)" />
      </svg>

      <div className={cn("flex items-end justify-between border-t border-line pt-4", compact ? "mt-2" : "mt-3")}>
        <div className="flex flex-col gap-1">
          <Label>Today</Label>
          <span className={cn("tabular-nums font-tabular leading-none tracking-[-0.02em] text-fg-strong", compact ? "text-[2.25rem]" : "text-[3rem]")}>
            {today === null ? "—" : (<><AnimatedNumber value={value} /><span className="text-[0.5em] text-muted-strong">%</span></>)}
          </span>
        </div>
        <dl className="flex gap-6 pb-1">
          <div className="flex flex-col items-end gap-1">
            <dt className="label-tech flex items-center gap-1.5 text-muted-strong">
              <svg viewBox="0 0 8 8" className="size-2" aria-hidden>
                <path d="M4 7 0.5 1h7z" fill="currentColor" />
              </svg>
              Last 7 days
            </dt>
            <dd className="tabular-nums text-[15px] font-tabular text-fg">{fmt(week)}</dd>
          </div>
          <div className="flex flex-col items-end gap-1">
            <dt className="label-tech flex items-center gap-1.5 text-muted-strong">
              <svg viewBox="0 0 8 8" className="size-2" aria-hidden>
                <path d="M4 7 0.5 1h7z" fill="none" stroke="currentColor" />
              </svg>
              Last 30 days
            </dt>
            <dd className="tabular-nums text-[15px] font-tabular text-fg">{fmt(month)}</dd>
          </div>
        </dl>
      </div>
    </figure>
  );
}
