"use client";

import { useTheme, type ThemePreference } from "@/state/theme";
import { Segmented } from "@/ui/controls";
import { Page, PageHeader } from "@/ui/page";

const THEMES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
] as const satisfies readonly { value: ThemePreference; label: string }[];

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-line py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12">
      <div className="flex flex-col gap-1">
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
      <PageHeader index={7} section="Settings" title="Settings" />

      <section aria-labelledby="appearance">
        <h2 id="appearance" className="label-tech text-muted-strong">
          Appearance
        </h2>
        <Row title="Theme" description="System follows your device setting.">
          <Segmented label="Theme" options={THEMES} value={preference} onChange={setPreference} />
        </Row>
      </section>
    </Page>
  );
}
