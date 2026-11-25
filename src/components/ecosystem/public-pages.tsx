import { isUsProfessional } from "@/domain/us-area";
import { socialIcons } from "./contact-account-dialog";
import { ProfessionalFilters } from "./professional-filters";
import { PublicReviews } from "./pilot-panels";
import { useEffect, useState, useRef } from "react";
import { trackSeoEvent } from "@/lib/seo-events";
import {
  PiArrowUpRight,
  PiArrowLeft,
  PiHeart,
  PiHeartFill,
  PiMapPin,
  PiStarFill,
  PiSealCheckFill,
  PiBuildings,
} from "react-icons/pi";
import {
  categories,
  subcategories,
  services,
  categoryName,
} from "@/data/catalog";
import { useStore } from "@/domain/store";
import {
  findProfessionals,
  filtersFromParams,
  orderProfessionals,
} from "@/domain/queries";
import {
  cityLabel,
  countyById,
  parseAreaQuery,
  readUsArea,
  stateLabel,
  usAreaParams,
} from "@/domain/us-area";
import { normalize, type Language, type Professional } from "@/domain/types";
import { socialContactUrl, socialPlatforms } from "@/domain/social-links";
import { useAuth } from "@/auth/auth-provider";
import { navigate, type Route } from "@/lib/navigation";
import { Button } from "@/components/ui/button";

import { SearchBar } from "@/components/search-bar";
import { searchParams } from "@/domain/search";
import { useCart } from "@/domain/cart";
import { ProfessionalCard } from "@/components/professional-card";
import { serviceIcon } from "@/components/category-icons";

import { parseBounds } from "@/domain/geography";
import {
  PageTitle,
  Field,
  Empty,
  Panel,
  EvidenceBadge,
  copy,
} from "./primitives";

export { CatalogPage } from "./catalog-page";

export function ServiceTile({
  serviceId,
  language,
}: {
  serviceId: string;
  language: Language;
}) {
  const service = services.find((s) => s.id === serviceId);
  if (!service) return null;
  const Icon = serviceIcon(service);
  return (
    <button
      className="service-tile"
      onClick={() => navigate(`/services/${service.id}`)}
    >
      <span className="inline-flex items-center gap-2">
        <Icon aria-hidden="true" />
        {categoryName(service.categoryId, language)}
      </span>
      <h3>{service.name[language]}</h3>
      <PiArrowUpRight />
    </button>
  );
}
export function PersonCard({
  person,
  language,
}: {
  person: Professional;
  language: Language;
}) {
  const t = copy(language);
  return (
    <ProfessionalCard
      person={person}
      language={language}
      category={categoryName(person.categoryId, language)}
      experience={t("años de experiencia", "years of experience")}
      details={t("Ver perfil", "View profile")}
      verifiedLabel={t("Verificado · demo", "Verified · demo")}
      onOpen={() => navigate(`/professionals/${person.id}`)}
    />
  );
}
export function DirectoryPage({
  route,
  language,
}: {
  route: Route;
  language: Language;
}) {
  const { state } = useStore();
  const t = copy(language);
  const [query, setQuery] = useState(route.params.get("q") || "");
  const [country, setCountry] = useState(route.params.get("country") || "");
  const routeLocation =
    route.params.get("city") ||
    (route.params.get("us") === "1"
      ? route.params.get("areaCity")
        ? cityLabel(route.params.get("areaCity")!, language).split(",")[0]
        : route.params.get("county")
          ? (countyById.get(route.params.get("county")!) ?? "")
          : route.params.get("state")
            ? stateLabel(route.params.get("state")!, language)
            : ""
      : "");
  const [city, setCity] = useState(routeLocation);
  useEffect(() => {
    setQuery(route.params.get("q") || "");
    setCountry(route.params.get("country") || "");
    setCity(routeLocation);
  }, [route.params.toString()]);
  const category = route.params.get("category") || "";
  const subcategory = route.params.get("subcategory") || "";
  const verified = route.params.get("verified") === "1";
  const min = Number(route.params.get("rating")) || 0;
  const area =
    route.params.get("us") === "1" ? readUsArea(route.params) : undefined;
  const areaLabel = area?.city
    ? cityLabel(area.city, language)
    : area?.county
      ? countyById.get(area.county)
      : area?.state
        ? stateLabel(area.state, language)
        : t("Estados Unidos", "United States");
  const mapArea = area ?? parseAreaQuery(route.params.get("city") || "").area;
  const mapParams = mapArea ? usAreaParams(mapArea) : new URLSearchParams();
  if (category) mapParams.set("category", category);
  const mapQuery = route.params.get("q");
  if (mapQuery) mapParams.set("q", mapQuery);
  for (const key of ["initials", "sort"]) {
    const value = route.params.get(key);
    if (value) mapParams.set(key, value);
  }
  const update = (key: string, value: string) => {
    const params = new URLSearchParams(route.params);
    value ? params.set(key, value) : params.delete(key);
    if (key === "category") params.delete("subcategory");
    navigate("/professionals", params);
  };
  const matched = findProfessionals(state, {
    ...filtersFromParams(route.params),
    usArea: area,
  });
  const results = orderProfessionals(
    matched,
    route.params.get("sort"),
    language,
  );
  return (
    <>
      <PageTitle
        eyebrow={t(
          "PERSONAS DETRÁS DE CADA PROYECTO",
          "PEOPLE BEHIND EVERY PROJECT",
        )}
        title={t(
          "Encuentra tu próxima conexión.",
          "Find your next connection.",
        )}
        description={t(
          "Busca por especialidad y por área de cobertura, más allá de la ciudad de la sede.",
          "Search by specialty and service area, beyond the city of the main office.",
        )}
        action={
          <Button asChild variant="outline">
            <a href={mapParams.size ? `#/areas?${mapParams}` : "#/areas"}>
              <PiMapPin />
              {t("Mapa de zonas", "Area map")}
            </a>
          </Button>
        }
      />
      {area && (
        <div className="us-directory-scope">
          <PiMapPin aria-hidden="true" />
          <strong>{areaLabel}</strong>
          <Button
            variant="ghost"
            onClick={() => {
              const params = new URLSearchParams(route.params);
              for (const name of ["us", "state", "county", "areaCity"])
                params.delete(name);
              navigate("/professionals", params);
            }}
          >
            {t("Quitar filtro de zona", "Remove area filter")}
          </Button>
        </div>
      )}
      <SearchBar
        language={language}
        query={query}
        city={city}
        country={country}
        onQuery={setQuery}
        onCity={setCity}
        onCountry={setCountry}
        onSearch={() => {
          const params = new URLSearchParams(route.params);
          if (query !== (route.params.get("q") || "")) {
            params.delete("category");
            params.delete("subcategory");
          }
          for (const key of [
            "q",
            "city",
            "country",
            "us",
            "state",
            "county",
            "areaCity",
          ])
            params.delete(key);
          for (const [key, value] of searchParams(query, city, country))
            params.set(key, value);
          navigate("/professionals", params);
        }}
      />
      <div className="filter-toolbar">
        <Field label={t("Categoría", "Category")}>
          <select
            value={category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">
              {t("Todas las categorías", "All categories")}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[language]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Subcategoría", "Subcategory")}>
          <select
            value={subcategory}
            onChange={(e) => update("subcategory", e.target.value)}
          >
            <option value="">{t("Todos los servicios", "All services")}</option>
            {subcategories
              .filter((s) => !category || s.categoryId === category)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {categoryName(s.categoryId, language)} · {s.name[language]}
                </option>
              ))}
          </select>
        </Field>
        <ProfessionalFilters
          language={language}
          params={route.params}
          update={update}
        />
        <label className="verified-filter">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => update("verified", e.target.checked ? "1" : "")}
          />
          {t("Con credencial verificada", "With verified credential")}
        </label>
        <Field label={t("Calificación mínima", "Minimum rating")}>
          <select
            value={min}
            onChange={(e) => update("rating", e.target.value)}
          >
            <option value="0">{t("Todas", "All")}</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
          </select>
        </Field>
      </div>
      <div className="eco-results-summary">
        <p role="status">
          {results.length} {t("perfiles publicados", "published profiles")}
        </p>
        <Button
          variant="outline"
          onClick={() =>
            navigate("/coverage", new URLSearchParams(route.params))
          }
        >
          <PiMapPin />
          {t("Ver en el mapa", "View on map")}
        </Button>
        <Button variant="ghost" onClick={() => navigate("/professionals")}>
          {t("Limpiar filtros", "Clear filters")}
        </Button>
      </div>
      {results.length ? (
        <div className="eco-people-grid professional-grid directory-grid">
          {results.map((p) => (
            <PersonCard key={p.id} person={p} language={language} />
          ))}
        </div>
      ) : (
        <Empty
          title={t(
            "No hay perfiles publicados con estos filtros.",
            "No published profiles match these filters.",
          )}
          description={t(
            "Prueba otra especialidad o una ubicación cercana.",
            "Try another specialty or a nearby location.",
          )}
        />
      )}
    </>
  );
}
export function ProfilePage({
  id,
  language,
  resumeReview = false,
}: {
  id: string;
  language: Language;
  resumeReview?: boolean;
}) {
  const { state, role, send } = useStore();
  const cart = useCart();
  const { checking, user: profileUser } = useAuth();
  const t = copy(language);
  const person = state.professionals.find(
    (p) => p.id === id && p.publication === "published" && isUsProfessional(p),
  );
  const viewed = useRef("");
  useEffect(() => {
    if (
      !checking &&
      person &&
      profileUser?.role !== "admin" &&
      profileUser?.professionalId !== person.id &&
      viewed.current !== person.id
    ) {
      viewed.current = person.id;
      trackSeoEvent(person.id, "profile_view");
    }
  }, [checking, person?.id, profileUser?.role, profileUser?.professionalId]);
  if (!person) return <Missing language={language} />;
  const favorite = state.favorites.includes(id);
  const socialLinks = socialPlatforms.map(([key, es, en]) => {
    const url = person.socialLinks?.[key];
    return {
      key,
      label: key === "whatsapp" ? "WhatsApp" : t(es, en),
      url: socialContactUrl(key, url),
    };
  });
  return (
    <>
      <button
        className="eco-back"
        onClick={() =>
          window.history.length > 1
            ? window.history.back()
            : navigate("/professionals")
        }
      >
        <PiArrowLeft />
        {t("Volver a profesionales", "Back to professionals")}
      </button>
      <div className="fur-hero">
        <img src={person.img} alt={categoryName(person.categoryId, language)} />
        <div>
          <p className="eyebrow">
            {person.fur} ·{" "}
            {person.id.startsWith("pro-")
              ? t("PERFIL PROFESIONAL", "BUSINESS PROFILE")
              : t("PERFIL DE DEMOSTRACIÓN", "DEMO PROFILE")}
          </p>
          <h1>{person.name}</h1>
          <p className="fur-specialty">
            {categoryName(person.categoryId, language)}
          </p>
          <p>
            <PiMapPin />
            {person.city}, {person.country}
          </p>
          <p>
            <PiStarFill />
            {person.rating.toFixed(1)} · {person.years}{" "}
            {t("años de experiencia", "years of experience")}
          </p>
          <div className="eco-actions">
            <Button
              onClick={() =>
                navigate(
                  "/quote",
                  new URLSearchParams({
                    professional: id,
                    service: person.serviceIds[0],
                  }),
                )
              }
            >
              {t("Solicitar presupuesto", "Request a quote")}
              <PiArrowUpRight />
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  "/workspace/owner/messages",
                  new URLSearchParams({ professional: id }),
                )
              }
            >
              {t("Escribir un mensaje", "Send a message")}
            </Button>
            {role === "owner" && (
              <Button
                variant="outline"
                disabled={checking}
                aria-pressed={favorite}
                onClick={() => send({ type: "favorite", professionalId: id })}
              >
                {favorite ? <PiHeartFill /> : <PiHeart />}
                {favorite
                  ? t("En favoritos", "In favorites")
                  : t("Añadir a favoritos", "Add to favorites")}
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="fur-layout">
        <div>
          <Panel title={t("Conoce nuestro trabajo", "Meet our team")}>
            <p className="eco-body">{person.bio[language]}</p>
            <div className="fur-portfolio">
              {person.portfolio.map((work) => (
                <figure key={work.id}>
                  <img src={work.image} alt={work.title[language]} />
                  <figcaption>
                    {work.title[language]}
                    {!person.id.startsWith("pro-") &&
                      " · " + t("ilustrativo", "illustrative")}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Panel>
          <PublicReviews
            key={id}
            professionalId={id}
            language={language}
            resumeReview={resumeReview}
          />
          <Panel title={t("Nuestros servicios", "Our services")}>
            <div className="service-grid">
              {person.serviceIds.map((service) => (
                <div key={service} className="profile-service-choice">
                  <ServiceTile serviceId={service} language={language} />
                  <Button
                    variant="outline"
                    disabled={cart.items.some(
                      (item) =>
                        item.professionalId === person.id &&
                        item.serviceId === service,
                    )}
                    onClick={() =>
                      cart.add({
                        professionalId: person.id,
                        serviceId: service,
                      })
                    }
                  >
                    {cart.items.some(
                      (item) =>
                        item.professionalId === person.id &&
                        item.serviceId === service,
                    )
                      ? t("En el carrito", "In your cart")
                      : t("Añadir al carrito", "Add to cart")}
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <aside>
          <Panel
            title={t("Redes sociales y página web", "Social media and website")}
          >
            <div className="profile-social-grid">
              {socialLinks.map(({ key, label, url }) => {
                const Icon = socialIcons[key];
                const content = (
                  <>
                    <span
                      className="social-brand-icon profile-social-icon"
                      data-platform={key}
                    >
                      <Icon aria-hidden="true" />
                    </span>
                    <span>
                      {label}
                      <small>
                        {url
                          ? t("Visitar", "Visit")
                          : t("Por agregar", "Not added yet")}
                      </small>
                    </span>
                    {url && (
                      <PiArrowUpRight
                        className="profile-social-arrow"
                        aria-hidden="true"
                      />
                    )}
                  </>
                );
                return url ? (
                  <a
                    key={key}
                    href={url}
                    onClick={() => {
                      if (key === "website")
                        trackSeoEvent(person.id, "website_click");
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-social-item"
                    aria-label={t(
                      `Abrir ${label} de ${person.name} (nueva pestaña)`,
                      `Open ${person.name}'s ${label} (new tab)`,
                    )}
                  >
                    {content}
                  </a>
                ) : (
                  <span
                    key={key}
                    className="profile-social-item is-unlinked"
                    aria-disabled="true"
                    title={t(
                      `${label}: el contratista puede agregar su enlace desde Mi ficha.`,
                      `${label}: the contractor can add a link in My profile.`,
                    )}
                  >
                    {content}
                  </span>
                );
              })}
            </div>
            <p className="eco-note">
              {t(
                "El contratista puede añadir sus enlaces desde Mi ficha.",
                "The contractor can add links in My profile.",
              )}
            </p>
          </Panel>
          <Panel title={t("Credenciales y confianza", "Credentials and trust")}>
            <p className="eco-note">
              {t(
                "Estados simulados. No acreditan una verificación real de personas o documentos.",
                "Simulated states. They do not certify real people or documents.",
              )}
            </p>
            {person.credentials.map((c) => (
              <div className="credential-public" key={c.id}>
                <PiSealCheckFill />
                <strong>{c.name[language]}</strong>
                <EvidenceBadge status={c.status} language={language} />
              </div>
            ))}
          </Panel>
          <Panel title={t("Sede y cobertura", "Office and service area")}>
            <p className="eco-body">
              {person.city} · {person.region}
              <br />
              {person.country}
            </p>
            <div className="coverage-chips">
              {person.coverage.map((area) => (
                <span key={area}>
                  <PiMapPin />
                  {area}
                </span>
              ))}
            </div>
            <p className="eco-note">
              {t(
                "Cobertura declarada para la demostración. Confirma disponibilidad al solicitar presupuesto.",
                "Declared demo coverage. Confirm availability when requesting a quote.",
              )}
            </p>
          </Panel>
        </aside>
      </div>
    </>
  );
}
export function Missing({ language }: { language: Language }) {
  const t = copy(language);
  return (
    <Empty
      title={t("Esta página no está disponible", "This page is not available")}
      description={t(
        "El enlace puede haber cambiado o la ficha no está publicada.",
        "The link may have changed or the profile is not published.",
      )}
    >
      <Button onClick={() => navigate("/catalog")}>
        {t("Explorar catálogo", "Explore catalog")}
      </Button>
    </Empty>
  );
}
