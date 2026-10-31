"use client";

import { Download, FlaskConical, RotateCcw, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { downloadText } from "@/lib/download";
import { useData } from "@/state/store";
import { useTheme, type ThemePreference } from "@/state/theme";
import { Button } from "@/ui/button";
import { Segmented, Switch } from "@/ui/controls";
import { Select } from "@/ui/field";
import { Dialog } from "@/ui/overlay";
import { Page, PageHeader } from "@/ui/page";
import { InstallApp } from "./install-app";
import { toast } from "@/ui/toast";

const THEMES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
] as const satisfies readonly { value: ThemePreference; label: string }[];

function Row({ title, description, children, htmlFor }: { title: string; description?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-4 border-b border-line py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12">
      <div className="flex flex-col gap-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-[15px] font-medium text-fg">
            {title}
          </label>
        ) : (
          <h3 className="text-[15px] font-medium text-fg">{title}</h3>
        )}
        {description ? <p className="max-w-prose text-[13px] text-muted-strong">{description}</p> : null}
      </div>
      <div className="md:justify-self-end">{children}</div>
    </div>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-14">
      <h2 id={id} className="label-tech border-b border-line pb-3 text-muted-strong">
        {title}
      </h2>
      {children}
    </section>
  );
}

function storageUsed(): string {
  try {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith("eq:")) bytes += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
    }
    return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return "unavailable";
  }
}

export function SettingsView() {
  const preference = useTheme((s) => s.preference);
  const setPreference = useTheme((s) => s.setPreference);
  const settings = useData((s) => s.settings);
  const mode = useData((s) => s.mode);
  const habits = useData((s) => s.habits.length);
  const updateSettings = useData((s) => s.updateSettings);
  const exportJSON = useData((s) => s.exportJSON);
  const importJSON = useData((s) => s.importJSON);
  const restoreBackup = useData((s) => s.restoreBackup);
  const clearAll = useData((s) => s.clearAll);
  const setMode = useData((s) => s.setMode);
  const today = useData((s) => s.today);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const p = settings.preferences;
  const f = settings.focusSettings;

  const onFile = async (file: File | undefined) => {
    setImportError(null);
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setImportError("That file is larger than 10 MB, which is more than any Equilibrium export.");
      return;
    }
    setPendingImport({ name: file.name, text: await file.text() });
    if (fileRef.current) fileRef.current.value = "";
  };

  const runImport = async () => {
    if (!pendingImport) return;
    const result = await importJSON(pendingImport.text);
    setPendingImport(null);
    if (result.ok) toast(`Imported ${result.habits} habits and ${result.logs} log entries. Previous data was backed up.`);
    else setImportError(result.error);
  };

  return (
    <Page>
      <PageHeader index={7} section="Settings" title="Settings" />

      <div className="max-w-4xl">
        <Group id="app" title="App">
          <Row title="Add to home screen" description="Install Equilibrium to open it full screen, like an app. Works offline — your data stays on this device.">
            <InstallApp />
          </Row>
        </Group>

        <Group id="appearance" title="Appearance">
          <Row title="Theme" description="System follows your device setting.">
            <Segmented label="Theme" options={THEMES} value={preference} onChange={setPreference} />
          </Row>
          <Row title="Reduce motion" description="Turns off parallax, camera movement and transitions. System follows your device setting.">
            <Segmented
              label="Reduce motion"
              value={p.reducedMotion}
              onChange={(reducedMotion) => updateSettings({ preferences: { reducedMotion } })}
              options={[
                { value: "system", label: "System" },
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
            />
          </Row>
          <Row title="3D quality" description="Auto lowers quality on slower devices. Low turns off shadows and post-processing.">
            <Segmented
              label="3D quality"
              value={p.quality}
              onChange={(quality) => updateSettings({ preferences: { quality } })}
              options={[
                { value: "auto", label: "Auto" },
                { value: "high", label: "High" },
                { value: "low", label: "Low" },
              ]}
            />
          </Row>
        </Group>

        <Group id="calendar" title="Calendar">
          <Row title="Week starts on">
            <Segmented
              label="Week starts on"
              value={String(p.weekStartsOn) as "0" | "1"}
              onChange={(v) => updateSettings({ preferences: { weekStartsOn: v === "0" ? 0 : 1 } })}
              options={[
                { value: "1", label: "Monday" },
                { value: "0", label: "Sunday" },
              ]}
            />
          </Row>
          <Row title="Day starts at" htmlFor="day-start" description="For late nights: anything before this hour counts toward the previous day.">
            <Select id="day-start" value={p.dayStartsAtHour} onChange={(e) => updateSettings({ preferences: { dayStartsAtHour: Number(e.target.value) } })} className="w-36">
              {[0, 1, 2, 3, 4, 5, 6].map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </Select>
          </Row>
        </Group>

        <Group id="focus" title="Focus">
          {(
            [
              ["Focus length", "work", [15, 20, 25, 30, 45, 50, 60, 90]],
              ["Short break", "short", [3, 5, 10, 15]],
              ["Long break", "long", [10, 15, 20, 30]],
            ] as const
          ).map(([title, key, options]) => (
            <Row key={key} title={title} htmlFor={`focus-${key}`}>
              <Select id={`focus-${key}`} value={f[key]} onChange={(e) => updateSettings({ focusSettings: { [key]: Number(e.target.value) } })} className="w-36">
                {[...new Set([...options, f[key]])].sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </Select>
            </Row>
          ))}
          <Row title="Start next phase automatically">
            <Switch checked={f.autoStart} onChange={(autoStart) => updateSettings({ focusSettings: { autoStart } })} label="Start next phase automatically" />
          </Row>
        </Group>

        <Group id="data" title="Data">
          <Row title="Export" description="Download everything — habits, history, journal and focus sessions — as a JSON file.">
            <Button
              variant="secondary"
              onClick={() => {
                downloadText(`equilibrium-${today}.json`, exportJSON());
                toast("Export downloaded.");
              }}
            >
              <Download className="size-4" strokeWidth={1.5} /> Export JSON
            </Button>
          </Row>
          <Row title="Import" description="Replace current data with an Equilibrium export. The file is checked first, and your current data is backed up.">
            <div className="flex flex-col items-start gap-2 md:items-end">
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" id="import-file" onChange={(e) => void onFile(e.target.files?.[0])} />
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" strokeWidth={1.5} /> Import JSON
              </Button>
              {importError ? (
                <p role="alert" className="max-w-xs font-mono text-[12px] text-fg md:text-right">
                  ! {importError}
                </p>
              ) : null}
            </div>
          </Row>
          <Row title="Restore backup" description="Return to the data saved automatically before the last import or reset.">
            <Button variant="secondary" onClick={() => setConfirmRestore(true)}>
              <RotateCcw className="size-4" strokeWidth={1.5} /> Restore
            </Button>
          </Row>
          <Row
            title="Sample data"
            description={mode === "sample" ? "You're viewing generated sample data. Your own data is kept separately." : "Explore Equilibrium with 150 days of generated data. Kept separate from your own records."}
          >
            <Button variant="secondary" onClick={() => void setMode(mode === "sample" ? "live" : "sample")}>
              <FlaskConical className="size-4" strokeWidth={1.5} /> {mode === "sample" ? "Exit sample data" : "Explore sample data"}
            </Button>
          </Row>
          <Row title="Clear all data" description={`Permanently remove ${mode === "sample" ? "the sample data" : "all habits, history, journal entries and focus sessions"} from this device. A backup is kept until the next import or reset.`}>
            <Button variant="secondary" onClick={() => setConfirmClear(true)} disabled={habits === 0 && mode === "live"}>
              <Trash2 className="size-4" strokeWidth={1.5} /> Clear data
            </Button>
          </Row>
          <p className="mt-4 font-mono text-[12px] text-muted-strong">Stored locally in this browser · {storageUsed()}</p>
        </Group>

        <Group id="about" title="About">
          <p className="py-5 text-[14px] text-muted-strong">
            Equilibrium — made by <span className="text-fg">Nourah Aleissa</span>.
          </p>
        </Group>
      </div>

      <Dialog
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title="Replace current data?"
        description={pendingImport ? `“${pendingImport.name}” will replace what's on this device. Your current data is backed up first.` : undefined}
        footer={
          <>
            <Button variant="ghost" data-autofocus onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button onClick={() => void runImport()}>Import</Button>
          </>
        }
      />
      <Dialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        title="Restore backup?"
        description="Current data will be replaced by the last automatic backup."
        footer={
          <>
            <Button variant="ghost" data-autofocus onClick={() => setConfirmRestore(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setConfirmRestore(false);
                toast((await restoreBackup()) ? "Backup restored." : "There's no backup on this device yet.");
              }}
            >
              Restore
            </Button>
          </>
        }
      />
      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all data?"
        description="Everything on this device will be removed. Export first if you want a copy you can keep."
        footer={
          <>
            <Button variant="ghost" data-autofocus onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setConfirmClear(false);
                await clearAll();
                toast("All data cleared.");
              }}
            >
              Clear everything
            </Button>
          </>
        }
      />
    </Page>
  );
}
