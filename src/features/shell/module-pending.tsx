import { navFor } from "./nav";
import { EmptyState } from "@/ui/feedback";
import { Page, PageHeader } from "@/ui/page";

/** Page frame with an empty state, used until a section's content is implemented. */
export function ModulePending({ href, title, empty, children }: { href: string; title: string; empty: string; children: React.ReactNode }) {
  const item = navFor(href)!;
  return (
    <Page>
      <PageHeader index={item.index} section={item.label} title={title} />
      <EmptyState title={empty}>{children}</EmptyState>
    </Page>
  );
}
