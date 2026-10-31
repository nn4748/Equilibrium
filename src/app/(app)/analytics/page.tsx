import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <ModulePending href="/analytics" title="Analytics" empty="Not enough data yet.">
      Charts appear after a few days of tracking.
    </ModulePending>
  );
}
