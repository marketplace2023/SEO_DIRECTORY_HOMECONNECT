// Source: https://ui.shadcn.com/r/styles/new-york-v4/skeleton.json
// Local adaptations: project cn path, React Icons and image accessibility where applicable.
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  );
}

export { Skeleton };
