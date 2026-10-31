"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addMonths, daysInMonth, formatKey, startOfMonth, startOfWeek } from "@/domain/dates";
import type { DateKey, Mood } from "@/domain/types";
import { cn } from "@/lib/cn";
import { useData } from "@/state/store";
import { Button, IconButton } from "@/ui/button";
import { Textarea } from "@/ui/field";
import { Dialog } from "@/ui/overlay";
import { Page, PageHeader } from "@/ui/page";
import { Label } from "@/ui/typography";

const MOODS: { value: Mood; label: string }[] = [
  { value: 1, label: "Low" },
  { value: 2, label: "Flat" },
  { value: 3, label: "Steady" },
  { value: 4, label: "Good" },
  { value: 5, label: "Strong" },
];

function MoodPicker({ value, onChange }: { value: Mood | null; onChange: (m: Mood | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Mood" className="grid grid-cols-5 border-l border-t border-line">
      {MOODS.map((m) => {
        const on = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : m.value)}
            className={cn(
              "flex h-16 flex-col items-center justify-end gap-2 border-b border-r border-line pb-2.5 transition-colors",
              on ? "bg-fg text-bg" : "text-muted-strong hover:bg-surface hover:text-fg",
            )}
          >
            <span aria-hidden className={cn("w-1.5", on ? "bg-bg" : "bg-current")} style={{ height: 4 + m.value * 4 }} />
            <span className="label-tech">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Editor for one day. Saves automatically, shortly after typing stops. */
function Editor({ date }: { date: DateKey }) {
  const entry = useData((s) => s.reflections[date]);
  const save = useData((s) => s.saveReflection);
  const remove = useData((s) => s.deleteReflection);
  const [content, setContent] = useState(entry?.content ?? "");
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [status, setStatus] = useState<"idle" | "pending" | "saved">("idle");
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ content, mood });

  const queue = (nextContent: string, nextMood: Mood | null, delay = 600) => {
    latest.current = { content: nextContent, mood: nextMood };
    setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save(date, nextContent, nextMood);
      setStatus("saved");
      timer.current = null;
    }, delay);
  };

  // Flush unsaved text when switching days or leaving the page.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        save(date, latest.current.content, latest.current.mood);
      }
    },
    [date, save],
  );

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>{formatKey(date, { weekday: "long" })}</Label>
          <h2 className="text-title font-medium text-fg-strong">{formatKey(date, { day: "numeric", month: "long", year: "numeric" })}</h2>
        </div>
        {entry ? (
          <IconButton label="Delete entry" onClick={() => setConfirm(true)}>
            <Trash2 className="size-4" strokeWidth={1.5} />
          </IconButton>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <Label>Mood</Label>
        <MoodPicker
          value={mood}
          onChange={(m) => {
            setMood(m);
            queue(content, m, 0);
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <Label>
            <label htmlFor="reflection">Reflection</label>
          </Label>
          <span className="label-tech text-muted-strong" aria-live="polite">
            {status === "pending" ? "Saving…" : status === "saved" ? "Saved" : `${words} words`}
          </span>
        </div>
        <Textarea
          id="reflection"
          rows={10}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            queue(e.target.value, mood);
          }}
          placeholder="What held today? What didn't?"
          className="min-h-56 text-[16px] leading-relaxed"
        />
        <p className="text-[12px] text-muted-strong">Stored only on this device. Included in your exports.</p>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this entry?"
        description={`Your reflection for ${formatKey(date, { day: "numeric", month: "long" })} will be removed.`}
        footer={
          <>
            <Button variant="ghost" data-autofocus onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (timer.current) clearTimeout(timer.current);
                timer.current = null;
                remove(date);
                setContent("");
                setMood(null);
                setStatus("idle");
                setConfirm(false);
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

function Calendar({ selected, onSelect }: { selected: DateKey; onSelect: (d: DateKey) => void }) {
  const today = useData((s) => s.today);
  const reflections = useData((s) => s.reflections);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);
  const [month, setMonth] = useState(startOfMonth(selected));
  const lead = useMemo(() => {
    const start = startOfWeek(month, weekStartsOn);
    let n = 0;
    for (let d = start; d < month; d = addDays(d, 1)) n++;
    return n;
  }, [month, weekStartsOn]);
  const heads = weekStartsOn === 1 ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-medium text-fg">{formatKey(month, { month: "long", year: "numeric" })}</span>
        <div className="flex">
          <IconButton label="Previous month" size="sm" onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Next month" size="sm" disabled={month >= startOfMonth(today)} onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {heads.map((h, i) => (
          <span key={i} className="label-tech text-center text-muted">
            {h}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`l${i}`} />
        ))}
        {Array.from({ length: daysInMonth(month) }, (_, i) => {
          const key = addDays(month, i);
          const entry = reflections[key];
          const isSel = key === selected;
          const future = key > today;
          return (
            <button
              key={key}
              type="button"
              disabled={future}
              aria-pressed={isSel}
              aria-label={`${formatKey(key, { day: "numeric", month: "long" })}${entry ? ", has entry" : ""}`}
              onClick={() => onSelect(key)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-1 font-mono text-[12px] transition-colors disabled:opacity-25",
                isSel ? "bg-fg text-bg" : entry ? "bg-surface-2 text-fg hover:bg-surface" : "text-muted-strong hover:bg-surface",
                key === today && !isSel && "outline outline-1 -outline-offset-1 outline-muted",
              )}
            >
              {Number(key.slice(8))}
              <span aria-hidden className={cn("h-0.5 w-3", entry ? (isSel ? "bg-bg" : "bg-fg") : "bg-transparent")} style={{ opacity: entry?.mood ? 0.4 + entry.mood * 0.12 : 1 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function JournalView() {
  const today = useData((s) => s.today);
  const reflections = useData((s) => s.reflections);
  const [selected, setSelected] = useState<DateKey | null>(null);
  const date = selected ?? today;
  const entries = useMemo(() => Object.values(reflections).sort((a, b) => b.date.localeCompare(a.date)), [reflections]);
  const [limit, setLimit] = useState(12);

  return (
    <Page>
      <PageHeader index={6} section="Journal" title="Journal" meta={`${entries.length} entr${entries.length === 1 ? "y" : "ies"}`} />
      <div className="grid gap-12 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16">
        <div className="order-2 flex flex-col gap-12 lg:order-1">
          <Calendar key={startOfMonth(date)} selected={date} onSelect={setSelected} />
          <section aria-labelledby="entries">
            <h2 id="entries" className="label-tech border-b border-line pb-3 text-muted-strong">
              Previous entries
            </h2>
            {entries.length === 0 ? (
              <p className="py-6 text-[14px] text-muted-strong">No entries yet. Today&apos;s page is open.</p>
            ) : (
              <ul>
                {entries.slice(0, limit).map((e) => (
                  <li key={e.date}>
                    <button
                      type="button"
                      onClick={() => setSelected(e.date)}
                      aria-current={e.date === date ? "true" : undefined}
                      className={cn("flex w-full flex-col gap-1 border-b border-line py-3 text-left transition-colors hover:bg-surface/60", e.date === date && "bg-surface")}
                    >
                      <span className="flex items-center justify-between gap-4 px-1">
                        <span className="font-mono text-[12px] text-fg">{formatKey(e.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                        {e.mood ? <span className="label-tech text-muted-strong">{MOODS[e.mood - 1]!.label}</span> : null}
                      </span>
                      {e.content ? <span className="line-clamp-2 px-1 text-[13px] text-muted-strong">{e.content}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {entries.length > limit ? (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setLimit(limit + 12)}>
                Show more
              </Button>
            ) : null}
          </section>
        </div>
        <div className="order-1 lg:order-2">
          <Editor key={date} date={date} />
        </div>
      </div>
    </Page>
  );
}
