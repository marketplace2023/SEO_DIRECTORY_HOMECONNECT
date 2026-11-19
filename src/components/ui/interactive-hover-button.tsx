// Source: https://magicui.design/r/interactive-hover-button.json
// Local adaptations: project cn path, React Icons and image accessibility where applicable.
import { PiArrowRight as ArrowRight } from "react-icons/pi";

import { cn } from "@/lib/utils";

export function InteractiveHoverButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "group bg-background relative w-auto cursor-pointer overflow-hidden rounded-full border p-2 px-6 text-center font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:transform-none motion-reduce:[&_.hover-label]:opacity-100 motion-reduce:[&_.hover-overlay]:hidden",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        <div className="bg-primary h-2 w-2 rounded-full transition-all duration-300 group-hover:scale-[100.8]"></div>
        <span className="hover-label inline-block transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {children}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="hover-overlay text-primary-foreground absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-5 group-hover:opacity-100"
      >
        <span>{children}</span>
        <ArrowRight />
      </div>
    </button>
  );
}
