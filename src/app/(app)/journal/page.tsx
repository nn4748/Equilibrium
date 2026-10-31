import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Journal" };

export default function Page() {
  return (
    <ModulePending href="/journal" title="Journal" empty="No entries yet.">
      Your daily notes will be listed here. They stay on this device.
    </ModulePending>
  );
}
