import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { themeBootScript } from "@/state/theme";
import { ServiceWorker } from "@/features/shell/service-worker";
import { ThemeSync } from "@/features/shell/theme-sync";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-app",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Equilibrium", template: "%s — Equilibrium" },
  description: "A simple, private habit tracker with a focus timer and journal.",
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
    <html lang="en" data-theme="dark" className={sans.variable} suppressHydrationWarning>
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
