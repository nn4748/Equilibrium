import { ChartNoAxesColumn, CircleCheck, Gauge, ListChecks, NotebookPen, Settings, Timer, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}

export const NAV: readonly NavItem[] = [
  { href: "/today", label: "Today", icon: CircleCheck, hint: "Check off today's habits" },
  { href: "/habits", label: "Habits", icon: ListChecks, hint: "Add and edit your habits" },
  { href: "/overview", label: "Progress", icon: Gauge, hint: "Your score and streaks" },
  { href: "/analytics", label: "Stats", icon: ChartNoAxesColumn, hint: "Charts over time" },
  { href: "/focus", label: "Focus", icon: Timer, hint: "A simple focus timer" },
  { href: "/journal", label: "Journal", icon: NotebookPen, hint: "Write about your day" },
  { href: "/settings", label: "Settings", icon: Settings, hint: "Theme, data and more" },
];

/** Bottom-bar slots on mobile; everything else lives in the "More" sheet. */
export const MOBILE_PRIMARY = ["/today", "/habits", "/overview", "/focus"] as const;

export function navFor(pathname: string): NavItem | undefined {
  return NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
