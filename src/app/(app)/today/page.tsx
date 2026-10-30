import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Today" };

export default function Page() {
  return (
    <ModulePending href="/today" title="Today" phase={3}>
      Scheduled habits, one-tap completion and the daily balance score arrive with the core habit features.
    </ModulePending>
  );
}
