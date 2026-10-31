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
import { t, useLang } from "@/i18n";

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
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
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
      setImportError(t("That file is too big to be an Equilibrium file."));
      return;
    }
    setPendingImport({ name: file.name, text: await file.text() });
    if (fileRef.current) fileRef.current.value = "";
  };

  const runImport = async () => {
    if (!pendingImport) return;
    const result = await importJSON(pendingImport.text);
    setPendingImport(null);
    if (result.ok) toast(t("Loaded {n} habits. Your old data was backed up.", { n: result.habits }));
    else setImportError(t(result.error));
  };

  return (
    <Page>
      <PageHeader title={t("Settings")} />

      <div className="max-w-4xl">
        <Group id="app" title={t("App")}>
          <Row title={t("Add to home screen")} description={t("Open Equilibrium like a normal app, full screen. It works offline too.")}>
            <InstallApp />
          </Row>
        </Group>

        <Group id="appearance" title={t("Appearance")}>
          <Row title={t("Language")} description={t("English or Arabic.")}>
            <Segmented
              label={t("Language")}
              value={lang}
              onChange={setLang}
              options={[
                { value: "en", label: "English" },
                { value: "ar", label: "العربية" },
              ]}
            />
          </Row>
          <Row title={t("Theme")} description={t("System follows your device setting.")}>
            <Segmented label={t("Theme")} options={THEMES} value={preference} onChange={setPreference} />
          </Row>
          <Row title={t("Reduce motion")} description={t("Fewer animations. System follows your phone or computer setting.")}>
            <Segmented
              label={t("Reduce motion")}
              value={p.reducedMotion}
              onChange={(reducedMotion) => updateSettings({ preferences: { reducedMotion } })}
              options={[
                { value: "system", label: "System" },
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
            />
          </Row>
          <Row title={t("3D quality")} description={t("Auto picks what works best on your device. Low saves battery.")}>
            <Segmented
              label={t("3D quality")}
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

        <Group id="calendar" title={t("Calendar")}>
          <Row title={t("Week starts on")}>
            <Segmented
              label={t("Week starts on")}
              value={String(p.weekStartsOn) as "0" | "1"}
              onChange={(v) => updateSettings({ preferences: { weekStartsOn: v === "0" ? 0 : 1 } })}
              options={[
                { value: "1", label: "Monday" },
                { value: "0", label: "Sunday" },
              ]}
            />
          </Row>
          <Row title={t("Day starts at")} htmlFor="day-start" description={t("Up late? Anything before this time counts as the day before.")}>
            <Select id="day-start" value={p.dayStartsAtHour} onChange={(e) => updateSettings({ preferences: { dayStartsAtHour: Number(e.target.value) } })} className="w-36">
              {[0, 1, 2, 3, 4, 5, 6].map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </Select>
          </Row>
        </Group>

        <Group id="focus" title={t("Focus")}>
          {(
            [
              ["Focus time", "work", [15, 20, 25, 30, 45, 50, 60, 90]],
              ["Short break", "short", [3, 5, 10, 15]],
              ["Long break", "long", [10, 15, 20, 30]],
            ] as const
          ).map(([title, key, options]) => (
            <Row key={key} title={t(title)} htmlFor={`focus-${key}`}>
              <Select id={`focus-${key}`} value={f[key]} onChange={(e) => updateSettings({ focusSettings: { [key]: Number(e.target.value) } })} className="w-36">
                {[...new Set([...options, f[key]])].sort((a, b) => a - b).map((m) => (
                  <option key={m} value={m}>
                    {m} {t("min")}
                  </option>
                ))}
              </Select>
            </Row>
          ))}
          <Row title={t("Start the next round automatically")}>
            <Switch checked={f.autoStart} onChange={(autoStart) => updateSettings({ focusSettings: { autoStart } })} label={t("Start the next round automatically")} />
          </Row>
        </Group>

        <Group id="data" title={t("Data")}>
          <Row title={t("Save a copy")} description={t("Save all your data to a file, so you can keep a copy.")}>
            <Button
              variant="secondary"
              onClick={() => {
                downloadText(`equilibrium-${today}.json`, exportJSON());
                toast(t("File saved."));
              }}
            >
              <Download className="size-4" strokeWidth={1.5} /> {t("Save file")}
            </Button>
          </Row>
          <Row title={t("Load a copy")} description={t("Load a file you saved before. Your current data is backed up first.")}>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" id="import-file" onChange={(e) => void onFile(e.target.files?.[0])} />
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" strokeWidth={1.5} /> {t("Load file")}
              </Button>
              {importError ? (
                <p role="alert" className="max-w-xs tabular-nums text-[12px] text-fg md:text-right">
                  ! {importError}
                </p>
              ) : null}
            </div>
          </Row>
          <Row title={t("Undo last load or reset")} description={t("Go back to your data from before the last load or reset.")}>
            <Button variant="secondary" onClick={() => setConfirmRestore(true)}>
              <RotateCcw className="size-4" strokeWidth={1.5} /> {t("Undo")}
            </Button>
          </Row>
          <Row
            title={t("Sample data")}
            description={mode === "sample" ? t("You're looking at made-up data. Your own data is safe.") : t("Try the app with 150 days of made-up data. Your own data stays safe.")}
          >
            <Button variant="secondary" onClick={() => void setMode(mode === "sample" ? "live" : "sample")}>
              <FlaskConical className="size-4" strokeWidth={1.5} /> {mode === "sample" ? t("Back to my data") : t("Try sample data")}
            </Button>
          </Row>
          <Row title={t("Delete all data")} description={mode === "sample" ? t("Remove the sample data from this device.") : t("Remove all your habits, history, notes and focus sessions from this device.")}>
            <Button variant="secondary" onClick={() => setConfirmClear(true)} disabled={habits === 0 && mode === "live"}>
              <Trash2 className="size-4" strokeWidth={1.5} /> {t("Delete all")}
            </Button>
          </Row>
          <p className="mt-4 tabular-nums text-[12px] text-muted-strong">{t("Saved on this device")} · {storageUsed()}</p>
        </Group>

        <Group id="about" title={t("About")}>
          <p className="py-5 text-[14px] text-muted-strong">
            {t("Equilibrium, made by")} <span className="text-fg">{t("Nourah Aleissa")}</span>.
          </p>
        </Group>
      </div>

      <Dialog
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title={t("Replace your data?")}
        description={pendingImport ? t("“{name}” will replace your current data. We'll back it up first.", { name: pendingImport.name }) : undefined}
        footer={
          <>
            <Button variant="ghost" data-autofocus onClick={() => setPendingImport(null)}>
              {t("Cancel")}
            </Button>
            <Button onClick={() => void runImport()}>{t("Replace")}</Button>
          </>
        }
      />
      <Dialog
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        title={t("Undo last load or reset?")}
        description={t("Your data will go back to how it was before.")}
        footer={
          <>
            <Button variant="ghost" data-autofocus onClick={() => setConfirmRestore(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={async () => {
                setConfirmRestore(false);
                toast((await restoreBackup()) ? t("Done. Your data is back.") : t("There's nothing to undo yet."));
              }}
            >
              {t("Undo")}
            </Button>
          </>
        }
      />
      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t("Delete all data?")}
        description={t("This removes everything from this device. Save a copy first if you want to keep it.")}
        footer={
          <>
            <Button variant="ghost" data-autofocus onClick={() => setConfirmClear(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={async () => {
                setConfirmClear(false);
                await clearAll();
                toast(t("All data deleted."));
              }}
            >
              {t("Delete all")}
            </Button>
          </>
        }
      />
    </Page>
  );
}
