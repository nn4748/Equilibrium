import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Manrope } from "next/font/google";
import { bootScript } from "@/lib/boot";
import { ServiceWorker } from "@/features/shell/service-worker";
import { LangRoot } from "@/features/shell/lang-root";
import { ThemeSync } from "@/features/shell/theme-sync";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-app",
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
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
    <html lang="en" data-theme="dark" className={`${sans.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="grain">
        <ThemeSync />
        <ServiceWorker />
        <LangRoot>{children}</LangRoot>
      </body>
    </html>
  );
}
