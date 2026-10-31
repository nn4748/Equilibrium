import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/features/shell/parts";
import { ButtonLink } from "@/ui/button";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col px-4 md:px-12">
      <header className="flex h-16 items-center">
        <Wordmark />
      </header>
      <div className="flex flex-1 flex-col justify-center gap-8 py-16">
        <h1 className="text-mega font-semibold text-fg-strong">Equilibrium</h1>
        <p className="max-w-md text-[17px] leading-snug text-muted-strong md:text-[19px]">Discipline is the architecture of a balanced life.</p>
        <div>
          <ButtonLink href="/today" size="lg">
            Enter Equilibrium <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" strokeWidth={1.5} />
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
