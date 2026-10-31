import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Today" };

export default function Page() {
  return (
    <ModulePending href="/today" title="Today" empty="Nothing scheduled today.">
      Habits scheduled for today will be listed here.
    </ModulePending>
  );
}
