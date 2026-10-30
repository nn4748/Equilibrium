import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return (
    <ModulePending href="/overview" title="Overview" phase={4}>
      The live structural model, balance gauge and streak summary will be assembled here.
    </ModulePending>
  );
}
