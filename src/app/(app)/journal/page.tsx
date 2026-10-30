import type { Metadata } from "next";
import { ModulePending } from "@/features/shell/module-pending";

export const metadata: Metadata = { title: "Journal" };

export default function Page() {
  return (
    <ModulePending href="/journal" title="Journal" phase={5}>
      A private, local-only daily reflection with mood.
    </ModulePending>
  );
}
