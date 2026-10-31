"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/ui/button";
import { toast } from "@/ui/toast";
import { t } from "@/i18n";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "installed" | "prompt" | "ios" | "other";

/**
 * Install control. Chromium browsers get a real install button; iOS Safari
 * has no install API, so it gets the Share → Add to Home Screen steps.
 */
export function InstallApp() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Reading the environment once on mount; there's no subscription to sync with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(standalone ? "installed" : ios ? "ios" : "other");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
      setPlatform("prompt");
    };
    const onInstalled = () => {
      setPlatform("installed");
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (platform === "installed") return <p className="tabular-nums text-[12px] text-fg">{t("Installed on this device")}</p>;

  if (platform === "prompt" && deferred)
    return (
      <Button
        variant="secondary"
        onClick={async () => {
          await deferred.prompt();
          const { outcome } = await deferred.userChoice;
          if (outcome === "accepted") toast(t("Equilibrium is on your home screen."));
          setDeferred(null);
        }}
      >
        <Download className="size-4" strokeWidth={1.5} /> {t("Install app")}
      </Button>
    );

  if (platform === "ios")
    return (
      <ol className="flex max-w-xs flex-col gap-1.5 text-[13px] text-muted-strong md:text-right">
        <li>
          {t("1. Tap")} <Share className="inline size-3.5 align-[-2px] text-fg" strokeWidth={1.75} aria-label={t("Share")} /> {t("in Safari")}
        </li>
        <li>{t("2. Choose “Add to Home Screen”")}</li>
      </ol>
    );

  return <p className="max-w-xs text-[13px] text-muted-strong md:text-right">{t("Use your browser menu: “Install app” or “Add to Home screen”.")}</p>;
}
