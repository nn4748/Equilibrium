"use client";

import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/hooks";
import { ArrowRight, Plus } from "lucide-react";
import { useTheme } from "@/state/theme";
import { Button, IconButton } from "@/ui/button";
import { Segmented, Switch, WeekdayPicker, WeightStepper, type Weekday, type WeightValue } from "@/ui/controls";
import { EmptyState, Skeleton } from "@/ui/feedback";
import { Field, Input, Select, Textarea } from "@/ui/field";
import { Dialog, Sheet } from "@/ui/overlay";
import { Page, PageHeader } from "@/ui/page";
import { CornerMarks, Data, Kbd, Label, Rule, SectionIndex, Ticks } from "@/ui/typography";

const TOKENS = ["bg", "bg-raised", "surface", "surface-2", "line", "line-faint", "muted", "muted-strong", "fg", "fg-strong"] as const;

function Section({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`s-${index}`} className="grid gap-8 border-t border-line py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
      <div className="flex flex-col gap-3">
        <SectionIndex index={index}>Spec</SectionIndex>
        <h2 id={`s-${index}`} className="text-heading font-medium text-fg-strong">
          {title}
        </h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Reads the live token values so the specimen always reflects the active theme. */
function useTokenValues() {
  const resolved = useTheme((s) => s.resolved);
  const hydrated = useHydrated();
  // `resolved` is applied to <html> before the store updates, so reading here is current.
  return useMemo<Record<string, string>>(() => {
    if (!hydrated) return {};
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(TOKENS.map((t) => [t, style.getPropertyValue(`--${t}`).trim().toUpperCase()]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when the theme changes
  }, [hydrated, resolved]);
}

export function Specimen() {
  const tokens = useTokenValues();
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [weight, setWeight] = useState<WeightValue>(3);
  const [days, setDays] = useState<Weekday[]>([1, 2, 3, 4, 5]);
  const [schedule, setSchedule] = useState<"daily" | "weekdays" | "weekly">("weekdays");
  const [notify, setNotify] = useState(true);
  const [title, setTitle] = useState("");

  return (
    <Page>
      <PageHeader title="Design system"  />

      <Section index={1} title="Typography">
        <div className="flex flex-col gap-10">
          <div>
            {/* Sized to the column here; on the landing page mega spans the viewport. */}
            <p className="text-mega font-semibold text-fg-strong [font-size:clamp(3rem,9vw,8.5rem)]">Equilibrium</p>
            <Label className="mt-6 block">Mega — Inter Tight 600 / −0.055em / fluid 56–192px</Label>
          </div>
          <div>
            <p className="text-display font-medium text-fg-strong">Build a life that holds.</p>
            <Label className="mt-3 block">Display — 500 / −0.045em / fluid 40–80px</Label>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-title font-medium text-fg">Structural integrity</p>
              <Label className="mt-2 block">Title — 500 / −0.035em</Label>
            </div>
            <div>
              <p className="text-heading font-medium text-fg">Remaining structural load</p>
              <Label className="mt-2 block">Heading — 500 / 20px</Label>
            </div>
            <div>
              <p className="max-w-prose text-body text-fg">
                Every habit is a structural member. Every action adds or removes load. Discipline creates equilibrium; neglect creates
                structural stress.
              </p>
              <Label className="mt-2 block">Body — 400 / 15px / 1.55</Label>
            </div>
            <div className="flex flex-col gap-3">
              <Label tone="fg">Load weight / W4.0</Label>
              <Data className="text-fg">084.6 / 100.0</Data>
              <Label className="block">Label 11px mono +0.08em · Data 13px mono tabular</Label>
            </div>
          </div>
        </div>
      </Section>

      <Section index={2} title="Tokens">
        <ul className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-5">
          {TOKENS.map((token) => (
            <li key={token} className="flex flex-col border-b border-r border-line">
              <span className="h-16 border-b border-line" style={{ background: `var(--${token})` }} />
              <span className="flex flex-col gap-1 p-3">
                <span className="tabular-nums text-[12px] text-fg">--{token}</span>
                <Data className="text-[12px] text-muted-strong">{tokens[token] ?? "—"}</Data>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-muted-strong">
          No hue anywhere. <span className="tabular-nums">muted</span> is reserved for large text and disabled states;{" "}
          <span className="tabular-nums">muted-strong</span> carries small labels on raised surfaces at ≥ 4.5:1.
        </p>
      </Section>

      <Section index={3} title="Grid & measure">
        <div className="relative h-56 border border-line bg-grid">
          <CornerMarks />
          <div className="absolute inset-x-6 top-6 grid h-[calc(100%-3rem)] grid-cols-4 gap-4 md:grid-cols-8 lg:grid-cols-12">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className={`border-x border-dashed border-line ${i >= 4 ? "hidden md:block" : ""} ${i >= 8 ? "md:hidden lg:block" : ""}`}>
                <span className="label-tech block pt-2 text-center text-muted">{String(i + 1).padStart(2, "0")}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Ticks count={64} major={8} />
          <div className="flex justify-between">
            <Label>4 col · 16px gutter</Label>
            <Label className="hidden md:block">8 col · 32px</Label>
            <Label className="hidden lg:block">12 col · 48px</Label>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {[4, 8, 12, 16, 24, 32, 48, 64].map((s) => (
              <div key={s} className="flex flex-col items-start gap-2">
                <span className="block bg-fg" style={{ width: s, height: s }} />
                <Data className="text-[12px] text-muted-strong">{s}</Data>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section index={4} title="Actions">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">
              Enter Equilibrium <ArrowRight className="flip-rtl size-4 transition-transform group-hover/button:translate-x-0.5" strokeWidth={1.5} />
            </Button>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button size="sm" variant="secondary">
              <Plus className="size-3.5" strokeWidth={1.5} /> Small
            </Button>
            <Button disabled>Disabled</Button>
            <IconButton label="Add habit">
              <Plus className="size-4" strokeWidth={1.5} />
            </IconButton>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-muted-strong">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            <span>Keyboard hint</span>
          </div>
        </div>
      </Section>

      <Section index={5} title="Inputs & controls">
        <div className="grid gap-10 md:grid-cols-2">
          <Field label="Name" hint="Keep it short and specific." meta={`${title.length}/60`}>
            {(p) => <Input {...p} maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 20 pages" />}
          </Field>
          <Field label="Category" error="A category is required.">
            {(p) => (
              <Select {...p} defaultValue="">
                <option value="" disabled>
                  Select category
                </option>
                <option>Body</option>
                <option>Mind</option>
                <option>Work</option>
              </Select>
            )}
          </Field>
          <Field label="Description" className="md:col-span-2">
            {(p) => <Textarea {...p} rows={3} placeholder="Optional" />}
          </Field>
          <div className="flex flex-col gap-3">
            <Label>Schedule</Label>
            <Segmented
              label="Schedule type"
              value={schedule}
              onChange={setSchedule}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekdays", label: "Days" },
                { value: "weekly", label: "Weekly" },
              ]}
            />
            <WeekdayPicker value={days} onChange={setDays} className="mt-2" />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Load weight</Label>
            <WeightStepper value={weight} onChange={setWeight} />
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-[14px] text-fg">Reminder</span>
              <Switch checked={notify} onChange={setNotify} label="Reminder" />
            </div>
          </div>
        </div>
      </Section>

      <Section index={6} title="Overlays">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDialog(true)}>
            Open dialog
          </Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Open sheet
          </Button>
        </div>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Archive habit?"
          description="It will be hidden from Today. Its history is kept."
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialog(false)}>Archive</Button>
            </>
          }
        >
          <p className="text-[14px] text-muted-strong">You can restore it from Habits at any time.</p>
        </Dialog>
        <Sheet
          open={sheet}
          onClose={() => setSheet(false)}
          title="New habit"
          footer={
            <>
              <Button variant="ghost" onClick={() => setSheet(false)}>
                Cancel
              </Button>
              <Button onClick={() => setSheet(false)}>Done</Button>
            </>
          }
        >
          <div className="flex flex-col gap-8">
            <Field label="Name">{(p) => <Input {...p} data-autofocus placeholder="Read 20 pages" />}</Field>
            <div className="flex flex-col gap-3">
              <Label>Load weight</Label>
              <WeightStepper value={weight} onChange={setWeight} />
            </div>
            
          </div>
        </Sheet>
      </Section>

      <Section index={7} title="Feedback & annotation">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Label>Loading</Label>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="flex flex-col gap-5">
            <Rule label="Section rule" />
            <Rule />
            <Ticks count={24} major={6} />
            <div className="relative h-20 p-4">
              <CornerMarks />
              <Label>Registration marks</Label>
            </div>
          </div>
          <EmptyState title="No habits yet." className="border border-dashed border-line md:col-span-2">
            Habits you create will be listed here.
          </EmptyState>
        </div>
      </Section>
    </Page>
  );
}
