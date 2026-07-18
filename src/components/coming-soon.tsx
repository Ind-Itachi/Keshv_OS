import { Hammer } from "lucide-react";

/** Placeholder for modules that arrive in a later build phase. */
export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Hammer className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="text-xl">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This module ships in Phase {phase} of the build plan. Projects, clients
        and users are live now.
      </p>
    </div>
  );
}
