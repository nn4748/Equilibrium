import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { themeBootScript } from "@/state/theme";
import { ServiceWorker } from "@/features/shell/service-worker";
import { ThemeSync } from "@/features/shell/theme-sync";
import "./globals.css";

const display = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Equilibrium", template: "%s — Equilibrium" },
  description: "Discipline is the architecture of a balanced life. A structural system for habits, focus and reflection.",
  applicationName: "Equilibrium",
  authors: [{ name: "Nourah Aleissa" }],
  creator: "Nourah Aleissa",
  // Home-screen app on iOS: full screen, own title, opaque status bar.
  appleWebApp: { capable: true, title: "Equilibrium", statusBarStyle: "black" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="grain">
        <ThemeSync />
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
