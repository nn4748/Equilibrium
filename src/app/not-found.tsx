import { ButtonLink } from "@/ui/button";
import { CornerMarks, Label } from "@/ui/typography";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-grid px-4">
      <div className="relative flex max-w-md flex-col gap-5 bg-bg p-10">
        <CornerMarks />
        <Label>Ref 404 / no such member</Label>
        <h1 className="text-title font-medium text-fg-strong">This bay was never built.</h1>
        <p className="text-muted-strong">The page you requested does not exist.</p>
        <div>
          <ButtonLink href="/today">Return to today</ButtonLink>
        </div>
      </div>
    </main>
  );
}
