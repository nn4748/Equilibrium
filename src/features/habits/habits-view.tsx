"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Archive, ArchiveRestore, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { describeSchedule } from "@/domain/schedule";
import { habitStreak } from "@/domain/streaks";
import type { Habit } from "@/domain/types";
import { cn } from "@/lib/cn";
import { useActiveHabits, useArchivedHabits } from "@/state/derived";
import { useData } from "@/state/store";
import { useUI } from "@/state/ui-store";
import { Button, IconButton } from "@/ui/button";
import { EmptyState } from "@/ui/feedback";
import { Dialog } from "@/ui/overlay";
import { Page, PageHeader } from "@/ui/page";
import { toast } from "@/ui/toast";
import { Label } from "@/ui/typography";
import { WeightMarks } from "@/features/today/habit-row";

const TIME = { anytime: "Any time", morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;

function SortableHabit({ habit, index, streak }: { habit: Habit; index: number; streak: number }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  const openEditor = useUI((s) => s.openEditor);
  const archiveHabit = useData((s) => s.archiveHabit);
  const restoreHabit = useData((s) => s.restoreHabit);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line bg-bg py-3 md:grid-cols-[auto_auto_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:gap-5",
        isDragging && "z-10 border-y border-fg shadow-layer",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Reorder ${habit.title}`}
        className="flex h-11 w-8 cursor-grab touch-none items-center justify-center text-muted-strong hover:text-fg active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" strokeWidth={1.5} />
      </button>
      <span className="hidden font-mono text-[11px] text-muted-strong md:block">{String(index + 1).padStart(2, "0")}</span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[16px] text-fg-strong">{habit.title}</span>
        <span className="flex flex-wrap gap-x-3 text-[12px] text-muted-strong md:hidden">
          <span>{describeSchedule(habit)}</span>
          <span>W{habit.weight}</span>
          {streak > 1 ? <span>{streak} in a row</span> : null}
        </span>
        {habit.description ? <span className="hidden truncate text-[13px] text-muted-strong md:block">{habit.description}</span> : null}
      </div>
      <div className="hidden flex-col gap-1 md:flex">
        <span className="text-[14px] text-fg">{describeSchedule(habit)}</span>
        <span className="text-[12px] text-muted-strong">
          {habit.category} · {TIME[habit.preferredTime]}
        </span>
      </div>
      <div className="hidden items-center gap-4 md:flex">
        <WeightMarks weight={habit.weight} className="text-fg" />
        <span className="font-mono text-[12px] text-muted-strong">{streak > 0 ? `${streak}× run` : "—"}</span>
      </div>
      <div className="flex items-center">
        <IconButton label={`Edit ${habit.title}`} onClick={() => openEditor(habit.id)}>
          <Pencil className="size-4" strokeWidth={1.5} />
        </IconButton>
        <IconButton
          label={`Archive ${habit.title}`}
          onClick={() => {
            archiveHabit(habit.id);
            toast(`“${habit.title}” archived. Its history is kept.`, { action: { label: "Undo", run: () => restoreHabit(habit.id) } });
          }}
        >
          <Archive className="size-4" strokeWidth={1.5} />
        </IconButton>
      </div>
    </li>
  );
}

export function HabitsView() {
  const active = useActiveHabits();
  const archived = useArchivedHabits();
  const logs = useData((s) => s.logs);
  const today = useData((s) => s.today);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);
  const reorder = useData((s) => s.reorderHabits);
  const restoreHabit = useData((s) => s.restoreHabit);
  const deleteHabit = useData((s) => s.deleteHabit);
  const openEditor = useUI((s) => s.openEditor);
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const streaks = useMemo(() => new Map(active.map((h) => [h.id, habitStreak(h, logs, today, weekStartsOn)])), [active, logs, today, weekStartsOn]);
  const totalLoad = active.reduce((s, h) => s + h.weight, 0);

  const onDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    if (!over || dragged.id === over.id) return;
    const ids = active.map((h) => h.id);
    reorder(arrayMove(ids, ids.indexOf(String(dragged.id)), ids.indexOf(String(over.id))));
  };

  return (
    <Page>
      <PageHeader
        index={3}
        section="Habits"
        title="Habits"
        meta={active.length ? `${active.length} active · load ${totalLoad}` : undefined}
        actions={
          <Button onClick={() => openEditor(null)}>
            <Plus className="size-4" strokeWidth={1.5} /> New habit
          </Button>
        }
      />

      {active.length === 0 ? (
        <EmptyState title="No habits yet.">Add a habit to start building your structure. Order and weight decide where it sits.</EmptyState>
      ) : (
        <>
          <div className="hidden grid-cols-[auto_auto_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] gap-5 border-b border-line pb-3 md:grid">
            <span className="w-8" />
            <Label>No.</Label>
            <Label>Habit</Label>
            <Label>Schedule</Label>
            <Label>Load · run</Label>
            <span className="w-20" />
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
            <SortableContext items={active.map((h) => h.id)} strategy={verticalListSortingStrategy}>
              <ul className="relative">
                {active.map((h, i) => (
                  <SortableHabit key={h.id} habit={h} index={i} streak={streaks.get(h.id) ?? 0} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <p className="mt-4 text-[13px] text-muted-strong">Drag to reorder. Order sets each habit&apos;s position in the structure, from the centre outward.</p>
        </>
      )}

      {archived.length > 0 ? (
        <section aria-labelledby="archived" className="mt-16">
          <h2 id="archived" className="label-tech border-b border-line pb-3 text-muted-strong">
            Archived · {archived.length}
          </h2>
          <ul>
            {archived.map((h) => (
              <li key={h.id} className="flex items-center gap-4 border-b border-line py-3">
                <span className="flex-1 truncate text-[15px] text-muted-strong">{h.title}</span>
                <IconButton
                  label={`Restore ${h.title}`}
                  onClick={() => {
                    restoreHabit(h.id);
                    toast(`“${h.title}” restored.`);
                  }}
                >
                  <ArchiveRestore className="size-4" strokeWidth={1.5} />
                </IconButton>
                <IconButton label={`Delete ${h.title} permanently`} onClick={() => setPendingDelete(h)}>
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </IconButton>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete permanently?"
        description={pendingDelete ? `“${pendingDelete.title}” and all of its history will be removed. This can't be undone.` : undefined}
        footer={
          <>
            <Button variant="ghost" data-autofocus onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingDelete) {
                  deleteHabit(pendingDelete.id);
                  toast(`“${pendingDelete.title}” deleted.`);
                }
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </Page>
  );
}
