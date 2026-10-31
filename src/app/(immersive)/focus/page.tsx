import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { Label } from "@/ui/typography";

export const metadata: Metadata = { title: "Focus" };

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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-title font-medium text-fg-strong">Focus</h1>
        <p className="text-muted-strong">Focus sessions aren&apos;t available yet.</p>
      </div>
    </main>
  );
}
