import type { Metadata } from "next";
import { Landing } from "@/features/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "Equilibrium — Discipline is the architecture of a balanced life" },
  description: "A habit system built on one idea: every habit is a structural member. Track completion, weight what matters, and keep your life in balance.",
};

export default function Home() {
  return <Landing />;
}
