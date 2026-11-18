import {
  PiArrowUpRight,
  PiMapPin,
  PiSealCheckFill,
  PiStarFill,
} from "react-icons/pi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { Professional } from "@/domain/types";
export function ProfessionalCard({
  person,
  category,
  experience,
  details,
  verifiedLabel = "Verificado · demo",
  onOpen,
}: {
  person: Professional;
  category: string;
  experience: string;
  details: string;
  verifiedLabel?: string;
  onOpen: () => void;
}) {
  const sample = !person.id.startsWith("pro-");
  return (
    <Card className="group gap-0 overflow-hidden rounded-xl border-neutral-200 bg-white py-0 shadow-none transition-shadow hover:shadow-md">
      <button
        onClick={onOpen}
        className="relative block w-full text-left"
        aria-label={`${details}: ${person.name}`}
      >
        <DirectionAwareHover
          imageUrl={person.img}
          alt={`${category} — ${person.name}`}
          className="h-60! w-full! rounded-none!"
          imageClassName="object-cover"
          childrenClassName="text-left"
        >
          <p className="text-xs font-semibold text-white">{category}</p>
          <p className="mt-1 text-lg font-bold text-white">{person.name}</p>
        </DirectionAwareHover>
        <Badge
          variant="secondary"
          className="absolute top-4 left-4 rounded-md bg-white/95 text-[10px] text-neutral-700"
        >
          {sample ? "DEMO" : "HOME CONNECT"}
        </Badge>
      </button>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-primary">{category}</span>
          <span className="flex items-center gap-1 text-xs font-bold">
            <PiStarFill className="text-[#e00707]" />
            {person.rating.toFixed(1)}
          </span>
        </div>
        <h3 className="text-lg leading-6 font-bold tracking-tight">
          <button onClick={onOpen} className="text-left hover:text-primary">
            {person.name}
          </button>
        </h3>
        <p className="flex items-start gap-1.5 text-xs leading-5 text-neutral-500">
          <PiMapPin className="mt-0.5 shrink-0" />
          {person.city}, {person.country}
        </p>
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-4">
          <span className="text-xs text-neutral-500">
            {person.years} {experience}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onOpen}
                  aria-label={`${details}: ${person.name}`}
                >
                  <PiArrowUpRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{details}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {person.credentials.some((c) => c.status === "verified") && (
          <Badge
            variant="outline"
            className="gap-1.5 border-neutral-200 text-[10px] font-normal text-neutral-500"
          >
            <PiSealCheckFill className="text-primary" />
            {verifiedLabel}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
