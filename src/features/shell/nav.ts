import {
  ChartNoAxesColumn,
  CircleDot,
  NotebookPen,
  Rows3,
  SlidersHorizontal,
  Timer,
  Triangle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Section number shown in the sidebar and page headers. */
  index: number;
  icon: LucideIcon;
  /** Short description used by the "More" sheet and, later, the command palette. */
  hint: string;
}

export const NAV: readonly NavItem[] = [
  { href: "/overview", label: "Overview", index: 1, icon: Triangle, hint: "Structure, balance and streaks" },
  { href: "/today", label: "Today", index: 2, icon: CircleDot, hint: "Today's scheduled members" },
  { href: "/habits", label: "Habits", index: 3, icon: Rows3, hint: "Define and order the structure" },
  { href: "/analytics", label: "Analytics", index: 4, icon: ChartNoAxesColumn, hint: "Trends, consistency, patterns" },
  { href: "/focus", label: "Focus", index: 5, icon: Timer, hint: "Full-screen deep work timer" },
  { href: "/journal", label: "Journal", index: 6, icon: NotebookPen, hint: "Daily reflection and mood" },
  { href: "/settings", label: "Settings", index: 7, icon: SlidersHorizontal, hint: "Theme, preferences and data" },
];

/** Bottom-bar slots on mobile; everything else lives in the "More" sheet. */
export const MOBILE_PRIMARY = ["/today", "/habits", "/overview", "/analytics"] as const;

export function navFor(pathname: string): NavItem | undefined {
  return NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
