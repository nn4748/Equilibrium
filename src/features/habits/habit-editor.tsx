"use client";

import { useState } from "react";
import { EMPTY_INPUT, inputFrom, validateInput, type HabitInput } from "@/domain/habits";
import { useData } from "@/state/store";
import { useUI } from "@/state/ui-store";
import { Button } from "@/ui/button";
import { Sheet } from "@/ui/overlay";
import { toast } from "@/ui/toast";
import { HabitForm, type FormErrors } from "./habit-form";
import { t } from "@/i18n";

/** Create/edit sheet, opened from anywhere through the UI store. */
export function HabitEditor() {
  const { open, habitId } = useUI((s) => s.editor);
  const close = useUI((s) => s.closeEditor);
  const habit = useData((s) => (habitId ? s.habits.find((h) => h.id === habitId) : undefined));

  return (
    <Sheet open={open} onClose={close} title={habit ? t("Edit habit") : t("New habit")}>
      {/* Keyed so the form resets each time the sheet opens. */}
      {open ? <EditorBody key={habitId ?? "new"} habitId={habit?.id ?? null} initial={habit ? inputFrom(habit) : EMPTY_INPUT} onDone={close} /> : null}
    </Sheet>
  );
}

function EditorBody({ habitId, initial, onDone }: { habitId: string | null; initial: HabitInput; onDone: () => void }) {
  const [value, setValue] = useState<HabitInput>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);
  const createHabit = useData((s) => s.createHabit);
  const updateHabit = useData((s) => s.updateHabit);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateInput(value);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (habitId) {
      updateHabit(habitId, value);
      toast(t("Saved."));
    } else {
      createHabit(value);
      toast(t("Added: {name}", { name: value.title.trim() }));
    }
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-10">
      <HabitForm value={value} onChange={setValue} errors={errors} weekStartsOn={weekStartsOn} />
      {habitId ? <p className="text-[13px] text-muted-strong">Changes start from today. Past days stay as they were.</p> : null}
      <div className="safe-bottom sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-3 border-t border-line bg-bg-raised px-6 py-4">
        <Button variant="ghost" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <Button type="submit">{habitId ? t("Save changes") : t("Add habit")}</Button>
      </div>
    </form>
  );
}
