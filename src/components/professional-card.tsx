import {
  PiArrowUpRight,
  PiHeart,
  PiHeartFill,
  PiMapPin,
  PiSealCheckFill,
  PiStarFill,
} from "react-icons/pi";
import { useAuth } from "@/auth/auth-provider";
import { useStore } from "@/domain/store";
import { Badge } from "@/components/ui/badge";
import type { Language, Professional } from "@/domain/types";
import type { ReactNode } from "react";
import "@/styles/professional-cards.css";

export function ProfessionalCard({
  person,
  category,
  experience,
  details,
  language,
  verifiedLabel = "Verificado · demo",
  onOpen,
  horizontal = false,
  children,
  selected,
}: {
  person: Professional;
  category: string;
  experience: string;
  details: string;
  language: Language;
  verifiedLabel?: string;
  onOpen: () => void;
  horizontal?: boolean;
  children?: ReactNode;
  selected?: boolean;
}) {
  const { user, checking } = useAuth();
  const { state, send } = useStore();
  const favorite =
    user?.role === "owner" && state.favorites.includes(person.id);
  const favoriteLabel = language === "es" ? "Favorito" : "Favorite";
  return (
    <article
      className={`professional-card${horizontal ? " professional-card-horizontal" : ""}${selected ? " selected" : ""}`}
      data-professional={horizontal ? person.id : undefined}
      aria-current={selected || undefined}
    >
      <div className="professional-card-photo">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${details}: ${person.name}`}
        >
          <img src={person.img} alt="" loading="lazy" decoding="async" />
        </button>
        <Badge variant="secondary" className="professional-card-badge">
          {person.id.startsWith("pro-") ? "HOME CONNECT" : "DEMO"}
        </Badge>
        <button
          type="button"
          className="professional-card-favorite"
          aria-pressed={favorite}
          aria-label={`${favoriteLabel}: ${person.name}`}
          disabled={checking}
          onClick={() => send({ type: "favorite", professionalId: person.id })}
        >
          {favorite ? (
            <PiHeartFill aria-hidden="true" />
          ) : (
            <PiHeart aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="professional-card-info">
        <h3>
          <button type="button" onClick={onOpen}>
            {person.name}
          </button>
        </h3>
        <div className="professional-card-summary">
          <span>{category}</span>
          <span className="professional-card-rating">
            <PiStarFill aria-hidden="true" /> {person.rating.toFixed(1)}
          </span>
        </div>
        <p className="professional-card-location">
          <PiMapPin aria-hidden="true" /> {person.city}, {person.country}
        </p>
        <div className="professional-card-summary">
          <span>
            {person.years} {experience}
          </span>
          <button
            type="button"
            className="professional-card-detail"
            title={details}
            aria-label={`${details}: ${person.name}`}
            onClick={onOpen}
          >
            <PiArrowUpRight aria-hidden="true" />
          </button>
        </div>
        {person.credentials.some(
          (credential) => credential.status === "verified",
        ) && (
          <Badge variant="outline" className="professional-card-verified">
            <PiSealCheckFill aria-hidden="true" />
            {verifiedLabel}
          </Badge>
        )}
        {children}
      </div>
    </article>
  );
}
