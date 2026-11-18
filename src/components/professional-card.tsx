import {
  PiArrowUpRight,
  PiMapPin,
  PiSealCheckFill,
  PiStarFill,
} from "react-icons/pi";
import { Card, CardContent } from "@/components/ui/card";
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
  return (
    <Card className="professional-card group">
      <button
        onClick={onOpen}
        className="professional-image"
        aria-label={`${details}: ${person.name}`}
      >
        <img
          src={person.img}
          alt={`${category} — ${person.name}`}
          loading="lazy"
        />
        {person.credentials.some((c) => c.status === "verified") && (
          <span className="verified-badge">
            <PiSealCheckFill />
            {verifiedLabel}
          </span>
        )}
        <span className="image-open">
          <PiArrowUpRight />
        </span>
      </button>
      <CardContent className="professional-content">
        <div className="professional-category">
          <span>{category}</span>
          <span className="professional-rating">
            <PiStarFill />
            {person.rating.toFixed(1)}
          </span>
        </div>
        <h3>
          <button onClick={onOpen}>{person.name}</button>
        </h3>
        <p className="professional-location">
          <PiMapPin />
          {person.city}, {person.country}
        </p>
        <div className="professional-card-bottom">
          <span>
            {person.years} {experience}
          </span>
          <button aria-label={`${details}: ${person.name}`} onClick={onOpen}>
            <PiArrowUpRight />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
