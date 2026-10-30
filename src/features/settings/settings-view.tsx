"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTheme, type ThemePreference } from "@/state/theme";
import { Segmented } from "@/ui/controls";
import { Page, PageHeader } from "@/ui/page";
import { Label } from "@/ui/typography";

const THEMES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
] as const satisfies readonly { value: ThemePreference; label: string }[];

/** One settings row: label column + control column, divided by hairlines. */
function Row({ code, title, description, children }: { code: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-line py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12">
      <div className="flex flex-col gap-1.5">
        <Label>{code}</Label>
        <h3 className="text-[16px] font-medium text-fg">{title}</h3>
        <p className="max-w-prose text-[14px] text-muted-strong">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsView() {
  const preference = useTheme((s) => s.preference);
  const setPreference = useTheme((s) => s.setPreference);

  return (
    <Page>
      <PageHeader index={7} section="Settings" title="Settings" meta="Config / local" />

      <section aria-labelledby="appearance" className="flex flex-col">
        <h2 id="appearance" className="label-tech mb-2 text-fg">
          A — Appearance
        </h2>
        <Row code="A.01" title="Theme" description="Dark is the reference rendering. System follows your device setting.">
          <Segmented label="Theme" options={THEMES} value={preference} onChange={setPreference} />
        </Row>
        <Row code="A.02" title="Design system" description="Specimen of the typography, tokens and components used throughout the product.">
          <Link href="/system" className="group inline-flex items-center gap-2 text-[14px] text-fg underline decoration-line underline-offset-4 hover:decoration-fg">
            Open specimen
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
        </Row>
        <div className="border-t border-line" />
      </section>

      <p className="label-tech mt-10 text-muted">Preferences, focus defaults and data management — phase 3.</p>
    </Page>
  );
}
