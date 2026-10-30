import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { CornerMarks, Label } from "@/ui/typography";

export const metadata: Metadata = { title: "Focus" };

/** Full-screen frame for Focus mode, outside the app shell. Timer arrives in phase 5. */
export default function FocusPage() {
  return (
    <main className="relative flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <Label>05 — Focus</Label>
        <Link
          href="/today"
          aria-label="Exit focus mode"
          className="inline-flex size-10 items-center justify-center text-muted-strong transition-colors hover:text-fg"
        >
          <X className="size-5" strokeWidth={1.25} />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="relative flex flex-col items-center gap-6 px-10 py-14 md:px-20">
          <CornerMarks />
          <p className="font-mono text-[clamp(4rem,16vw,10rem)] font-light leading-none tracking-[-0.06em] text-fg-strong font-tabular">25:00</p>
          <Label>Timer module — phase 5</Label>
        </div>
      </div>
    </main>
  );
}
