import { ButtonLink } from "@/ui/button";
import { CornerMarks, Label } from "@/ui/typography";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="relative flex max-w-md flex-col gap-5 p-10">
        <CornerMarks />
        <Label>404</Label>
        <h1 className="text-title font-medium text-fg-strong">Page not found</h1>
        <p className="text-muted-strong">The page you’re looking for doesn’t exist or has moved.</p>
        <div>
          <ButtonLink href="/today">Go to Today</ButtonLink>
        </div>
      </div>
    </main>
  );
}
