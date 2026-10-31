import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Habits" };

export default function Page() {
  return (
    <ModulePending href="/habits" title="Habits" empty="No habits yet.">
      Habits you create will be listed here, in the order you choose.
    </ModulePending>
  );
}
