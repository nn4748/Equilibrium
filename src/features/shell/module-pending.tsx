import { navFor } from "./nav";
import { ButtonLink } from "@/ui/button";
import { EmptyState } from "@/ui/feedback";
import { Page, PageHeader } from "@/ui/page";

/**
 * Honest stand-in for a section whose module ships in a later build phase.
 * Renders the real page frame so navigation and layout can be reviewed.
 */
export function ModulePending({ href, title, phase, children }: { href: string; title: string; phase: number; children: React.ReactNode }) {
  const item = navFor(href)!;
  return (
    <Page>
      <PageHeader index={item.index} section={item.label} title={title} meta={`Module ${String(item.index).padStart(2, "0")}`} />
      <EmptyState
        code={`Under construction — phase ${phase}`}
        title="This bay has not been built yet."
        action={
          <ButtonLink href="/system" variant="secondary" size="sm">
            View design system
          </ButtonLink>
        }
      >
        {children}
      </EmptyState>
    </Page>
  );
}
