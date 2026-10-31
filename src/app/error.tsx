"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/ui/button";
import { CornerMarks, Label } from "@/ui/typography";
import { t } from "@/i18n";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="relative flex max-w-md flex-col gap-5 p-10">
        <CornerMarks />
        <Label>{t("Error")}{error.digest ? ` · ${error.digest}` : ""}</Label>
        <h1 className="text-title font-medium text-fg-strong">{t("Something went wrong")}</h1>
        <p className="text-muted-strong">{t("Your data is saved on this device and hasn’t been affected.")}</p>
        <div className="flex gap-3">
          <Button onClick={reset}>{t("Try again")}</Button>
          <ButtonLink href="/today" variant="secondary">
            {t("Today")}
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
