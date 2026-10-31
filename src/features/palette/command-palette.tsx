"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, CornerDownLeft, Download, Moon, Pencil, Plus, Search, Timer, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { downloadText } from "@/lib/download";
import { useFocusTrap, useHydrated, useScrollLock } from "@/lib/hooks";
import { NAV } from "@/features/shell/nav";
import { useActiveHabits, useDay } from "@/state/derived";
import { useData } from "@/state/store";
import { useTheme } from "@/state/theme";
import { useUI } from "@/state/ui-store";
import { Kbd } from "@/ui/typography";
import { toast } from "@/ui/toast";

interface Command {
  id: string;
  group: "Today" | "Actions" | "Go to" | "Habits";
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  keywords?: string;
  run: () => void;
}

/** Subsequence match; earlier and contiguous matches score higher. 0 = no match. */
function score(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const direct = t.indexOf(q);
  if (direct >= 0) return 100 - direct;
  let ti = 0;
  let s = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return 0;
    s += found === ti ? 2 : 1;
    ti = found + 1;
  }
  return s;
}

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPaletteOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUI.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const hydrated = useHydrated();
  if (!hydrated) return null;
  return createPortal(<AnimatePresence>{open ? <Palette onClose={() => setOpen(false)} /> : null}</AnimatePresence>, document.body);
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  useScrollLock(true);

  const habits = useActiveHabits();
  const { entries } = useDay();
  const toggleCompletion = useData((s) => s.toggleCompletion);
  const openEditor = useUI((s) => s.openEditor);
  const toggleTheme = useTheme((s) => s.toggle);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const list: Command[] = [];
    for (const e of entries) {
      if (e.status === "completed")
        list.push({ id: `undo-${e.habit.id}`, group: "Today", label: `Undo: ${e.habit.title}`, icon: Undo2, keywords: "uncheck", run: () => (toggleCompletion(e.habit.id), onClose()) });
      else if (e.status === "pending" || e.status === "optional")
        list.push({
          id: `done-${e.habit.id}`,
          group: "Today",
          label: `Mark done: ${e.habit.title}`,
          icon: Check,
          keywords: "done check",
          run: () => {
            toggleCompletion(e.habit.id);
            toast(`Done: ${e.habit.title}`, { action: { label: "Undo", run: () => toggleCompletion(e.habit.id) } });
            onClose();
          },
        });
    }
    list.push(
      { id: "new", group: "Actions", label: "New habit", icon: Plus, keywords: "create add", run: () => openEditor(null) },
      { id: "focus", group: "Actions", label: "Start focus timer", icon: Timer, keywords: "pomodoro timer", run: go("/focus") },
      { id: "theme", group: "Actions", label: "Switch light / dark", icon: Moon, keywords: "dark light", run: () => (toggleTheme(), onClose()) },
      {
        id: "export",
        group: "Actions",
        label: "Save data to a file",
        icon: Download,
        keywords: "backup json download",
        run: () => {
          downloadText(`equilibrium-${useData.getState().today}.json`, useData.getState().exportJSON());
          toast("File saved.");
          onClose();
        },
      },
    );
    for (const n of NAV) list.push({ id: `nav-${n.href}`, group: "Go to", label: n.label, hint: n.hint, icon: ArrowRight, run: go(n.href) });
    for (const h of habits) list.push({ id: `edit-${h.id}`, group: "Habits", label: h.title, hint: h.category, icon: Pencil, keywords: "edit", run: () => openEditor(h.id) });
    return list;
  }, [entries, habits, onClose, openEditor, router, toggleCompletion, toggleTheme]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return commands.filter((c) => c.group !== "Habits");
    return commands
      .map((c) => ({ c, s: Math.max(score(q, c.label), score(q, c.keywords ?? "") * 0.6, score(q, c.hint ?? "") * 0.4) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.c);
  }, [commands, query]);

  const current = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[current]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[12vh]">
      <motion.div className="absolute inset-0 bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
      <motion.div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative flex max-h-[70dvh] w-full max-w-xl flex-col bg-bg-raised shadow-layer"
        initial={{ opacity: 0, y: -8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.99, transition: { duration: 0.12 } }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-muted-strong" strokeWidth={1.5} aria-hidden />
          <input
            data-autofocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Type to search"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[current] ? `cmd-${results[current]!.id}` : undefined}
            className="h-14 flex-1 bg-transparent text-[16px] text-fg outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul ref={listRef} id="palette-list" role="listbox" className="flex-1 overflow-y-auto py-2">
          {results.length === 0 ? <li className="px-4 py-8 text-center text-[14px] text-muted-strong">Nothing found.</li> : null}
          {results.map((c, i) => {
            const header = c.group !== results[i - 1]?.group ? c.group : null;
            const Icon = c.icon;
            return (
              <li key={c.id} role="presentation">
                {header ? <div className="label-tech px-4 pb-1.5 pt-3 text-muted">{header}</div> : null}
                <div
                  id={`cmd-${c.id}`}
                  role="option"
                  aria-selected={i === current}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => c.run()}
                  className={cn("mx-2 flex h-11 cursor-pointer items-center gap-3 px-3 text-[14px]", i === current ? "bg-surface-2 text-fg-strong" : "text-fg")}
                >
                  <Icon className="size-4 shrink-0 text-muted-strong" strokeWidth={1.5} />
                  <span className="truncate">{c.label}</span>
                  {c.hint ? <span className="ml-auto truncate pl-4 text-[12px] text-muted-strong">{c.hint}</span> : null}
                  {i === current ? <CornerDownLeft className={cn("size-3.5 shrink-0 text-muted-strong", !c.hint && "ml-auto")} strokeWidth={1.5} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}
