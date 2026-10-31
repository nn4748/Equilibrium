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
  index: number;
  icon: LucideIcon;
  hint: string;
}

export const NAV: readonly NavItem[] = [
  { href: "/overview", label: "Overview", index: 1, icon: Triangle, hint: "Balance, streaks and progress" },
  { href: "/today", label: "Today", index: 2, icon: CircleDot, hint: "What's scheduled today" },
  { href: "/habits", label: "Habits", index: 3, icon: Rows3, hint: "Create and organise habits" },
  { href: "/analytics", label: "Analytics", index: 4, icon: ChartNoAxesColumn, hint: "Trends and consistency" },
  { href: "/focus", label: "Focus", index: 5, icon: Timer, hint: "Timed deep-work sessions" },
  { href: "/journal", label: "Journal", index: 6, icon: NotebookPen, hint: "Daily notes and mood" },
  { href: "/settings", label: "Settings", index: 7, icon: SlidersHorizontal, hint: "Appearance and data" },
];

/** Bottom-bar slots on mobile; everything else lives in the "More" sheet. */
export const MOBILE_PRIMARY = ["/today", "/habits", "/overview", "/analytics"] as const;

export function navFor(pathname: string): NavItem | undefined {
  return NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
