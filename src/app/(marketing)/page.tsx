import type { Metadata } from "next";
import { Landing } from "@/features/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "Equilibrium: build good habits, one day at a time" },
  description: "A simple, private habit tracker. Check off your habits each day and watch your progress. No account needed.",
};

export default function Home() {
  return <Landing />;
}
