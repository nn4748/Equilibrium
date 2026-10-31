"use client";

import { ButtonLink } from "@/ui/button";
import { CornerMarks, Label } from "@/ui/typography";
import { t } from "@/i18n";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="relative flex max-w-md flex-col gap-5 p-10">
        <CornerMarks />
        <Label>404</Label>
        <h1 className="text-title font-medium text-fg-strong">{t("Page not found")}</h1>
        <p className="text-muted-strong">{t("The page you’re looking for doesn’t exist or has moved.")}</p>
        <div>
          <ButtonLink href="/today">{t("Go to Today")}</ButtonLink>
        </div>
      </div>
    </main>
  );
}
