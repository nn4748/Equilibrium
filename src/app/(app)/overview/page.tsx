import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return (
    <ModulePending href="/overview" title="Overview" empty="No habits yet.">
      Once you add habits, your balance score and streaks will show here.
    </ModulePending>
  );
}
