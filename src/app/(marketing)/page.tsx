import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/features/shell/parts";
import { ButtonLink } from "@/ui/button";
import { Label, Ticks } from "@/ui/typography";

/** Interim entry page. The cinematic landing replaces this in phase 2. */
export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col bg-grid px-4 md:px-12">
      <header className="flex h-16 items-center justify-between">
        <Wordmark />
        <Label className="hidden sm:block">N 00°00′ / E 00°00′ — Rev A</Label>
      </header>
      <div className="flex flex-1 flex-col justify-center gap-10 py-16">
        <Label>Discipline is the architecture of a balanced life.</Label>
        <h1 className="text-mega font-semibold text-fg-strong">Equilibrium</h1>
        <Ticks count={48} major={8} className="max-w-3xl" />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/today" size="lg">
            Enter Equilibrium <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" strokeWidth={1.5} />
          </ButtonLink>
          <ButtonLink href="/system" size="lg" variant="secondary">
            Design system
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
