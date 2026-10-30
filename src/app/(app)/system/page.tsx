import type { Metadata } from "next";
import { Specimen } from "@/features/system/specimen";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

export default function Page() {
  return <Specimen />;
}
