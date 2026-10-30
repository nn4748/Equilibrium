import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Habits" };

export default function Page() {
  return (
    <ModulePending href="/habits" title="Habits" phase={3}>
      Create, schedule, weight and reorder the members of your structure.
    </ModulePending>
  );
}
