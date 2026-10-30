import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <ModulePending href="/analytics" title="Analytics" phase={5}>
      Trends, consistency and time-of-day patterns — calculated only from your recorded data.
    </ModulePending>
  );
}
