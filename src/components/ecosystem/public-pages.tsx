import { useEffect, useState } from "react";
import {
  PiArrowUpRight,
  PiArrowLeft,
  PiHeart,
  PiHeartFill,
  PiMapPin,
  PiStarFill,
  PiSealCheckFill,
  PiCheck,
  PiBuildings,
  PiGlobe,
  PiInstagramLogo,
  PiFacebookLogo,
  PiLinkedinLogo,
  PiYoutubeLogo,
  PiTiktokLogo,
  PiXLogo,
  PiLinkSimple,
} from "react-icons/pi";
import {
  categories,
  subcategories,
  services,
  categoryName,
  serviceName,
} from "@/data/catalog";
import { useStore } from "@/domain/store";
import { findProfessionals } from "@/domain/queries";
import {
  cityLabel,
  countyById,
  parseAreaQuery,
  readUsArea,
  stateLabel,
  usAreaParams,
} from "@/domain/us-area";
import { normalize, type Language, type Professional } from "@/domain/types";
import { isPublicWebUrl, socialPlatforms } from "@/domain/social-links";
import { navigate, type Route } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchBar } from "@/components/search-bar";
import { searchParams } from "@/domain/search";
import { useCart } from "@/domain/cart";
import { ProfessionalCard } from "@/components/professional-card";
import { categoryIcons } from "@/components/category-icons";
import {
  PageTitle,
  Field,
  Empty,
  Panel,
  EvidenceBadge,
  copy,
} from "./primitives";

const socialIcons = {
  website: PiGlobe,
  instagram: PiInstagramLogo,
  facebook: PiFacebookLogo,
  linkedin: PiLinkedinLogo,
  youtube: PiYoutubeLogo,
  tiktok: PiTiktokLogo,
  x: PiXLogo,
  other: PiLinkSimple,
};

export function CatalogPage({
  route,
  language,
}: {
  route: Route;
  language: Language;
}) {
  const t = copy(language);
  const [query, setQuery] = useState("");
  const selected = categories.find(
    (c) => c.id === route.params.get("category"),
  );
  const visible = categories.filter((c) =>
    normalize(c.name[language]).includes(normalize(query)),
  );
  return (
    <>
      <PageTitle
        eyebrow={t("ELIGE TU SIGUIENTE PASO", "CHOOSE YOUR NEXT STEP")}
        title={
          selected?.name[language] ||
          t("Una especialidad para cada idea.", "A specialty for every idea.")
        }
        description={t(
          "32 categorías. Explora nuestra selección inicial de servicios y encuentra quién puede ayudarte.",
          "32 categories. Explore our starting selection of services and find someone who can help.",
        )}
        action={
          <Button onClick={() => navigate("/professionals")}>
            {t("Ver profesionales", "See professionals")}
            <PiArrowUpRight />
          </Button>
        }
      />
      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <Field label={t("Buscar categoría", "Find a category")}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Ej. pintura", "E.g. painting")}
            />
          </Field>
          <button
            className={!selected ? "selected" : ""}
            onClick={() => navigate("/catalog")}
          >
            {t("Todas las categorías", "All categories")}
            <span>32</span>
          </button>
          {visible.map((c) => {
            const Icon = categoryIcons[c.reference - 1] || PiBuildings;
            return (
              <button
                key={c.id}
                className={selected?.id === c.id ? "selected" : ""}
                onClick={() =>
                  navigate("/catalog", new URLSearchParams({ category: c.id }))
                }
              >
                <Icon />
                {c.name[language]}
              </button>
            );
          })}
          {!visible.length && <p>{t("Sin coincidencias", "No matches")}</p>}
        </aside>
        <div className="catalog-content">
          {selected ? (
            <>
              {subcategories
                .filter((s) => s.categoryId === selected.id)
                .map((group) => (
                  <Panel key={group.id} title={group.name[language]}>
                    <div className="service-grid">
                      {services
                        .filter((s) => s.subcategoryId === group.id)
                        .map((service) => (
                          <ServiceTile
                            key={service.id}
                            serviceId={service.id}
                            language={language}
                          />
                        ))}
                    </div>
                  </Panel>
                ))}
              <p className="eco-note">
                {t(
                  "Selección inicial normalizada a partir de las referencias. Ampliaremos el catálogo sin duplicar categorías.",
                  "An initial selection normalized from the references. The catalog can expand without duplicating categories.",
                )}
              </p>
            </>
          ) : (
            <div className="catalog-category-grid">
              {visible.map((c) => {
                const Icon = categoryIcons[c.reference - 1] || PiBuildings;
                return (
                  <button
                    key={c.id}
                    className="catalog-category"
                    onClick={() =>
                      navigate(
                        "/catalog",
                        new URLSearchParams({ category: c.id }),
                      )
                    }
                  >
                    <span className="catalog-index">
                      {String(c.reference).padStart(2, "0")}
                    </span>
                    <Icon />
                    <h2>{c.name[language]}</h2>
                    <span>
                      3 {t("servicios", "services")}
                      <PiArrowUpRight />
                    </span>
                  </button>
                );
              })}
              {!visible.length && (
                <Empty
                  title={t(
                    "No encontramos esa categoría",
                    "Category not found",
                  )}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export function ServiceTile({
  serviceId,
  language,
}: {
  serviceId: string;
  language: Language;
}) {
  const service = services.find((s) => s.id === serviceId);
  if (!service) return null;
  return (
    <button
      className="service-tile"
      onClick={() => navigate(`/services/${service.id}`)}
    >
      <span>{categoryName(service.categoryId, language)}</span>
      <h3>{service.name[language]}</h3>
      <PiArrowUpRight />
    </button>
  );
}
export function ServicePage({
  id,
  language,
}: {
  id: string;
  language: Language;
}) {
  const { state } = useStore();
  const t = copy(language);
  const service = services.find((s) => s.id === id);
  if (!service) return <Missing language={language} />;
  const people = state.professionals.filter(
    (p) => p.publication === "published" && p.serviceIds.includes(id),
  );
  return (
    <>
      <PageTitle
        eyebrow={categoryName(service.categoryId, language)}
        title={service.name[language]}
        description={t(
          "Cada espacio necesita una solución distinta. Describe el trabajo, compara propuestas y acuerda los detalles con tu profesional.",
          "Every space needs a different solution. Describe the work, compare proposals and agree on the details with your professional.",
        )}
        action={
          <Button
            onClick={() =>
              navigate("/quote", new URLSearchParams({ service: id }))
            }
          >
            {t("Solicitar presupuesto", "Request a quote")}
            <PiArrowUpRight />
          </Button>
        }
      />
      <div className="service-detail">
        <Panel title={t("Antes de empezar", "Before you start")}>
          <ul className="eco-checklist">
            {[
              t(
                "Describe el estado actual y el resultado que buscas.",
                "Describe the current condition and the result you want.",
              ),
              t(
                "Indica la ubicación, dimensiones y fecha orientativa.",
                "Include the location, dimensions and preferred date.",
              ),
              t(
                "Confirma materiales, alcance y condiciones en la propuesta.",
                "Confirm materials, scope and terms in the proposal.",
              ),
            ].map((item) => (
              <li key={item}>
                <PiCheck />
                {item}
              </li>
            ))}
          </ul>
          <p className="eco-note">
            {t(
              "El presupuesto depende del alcance. No se realizan cobros en este prototipo.",
              "Pricing depends on scope. This prototype does not process payments.",
            )}
          </p>
        </Panel>
        <Panel
          title={t(
            "Profesionales para este servicio",
            "Professionals for this service",
          )}
        >
          {people.length ? (
            <div className="eco-people-grid">
              {people.map((p) => (
                <PersonCard key={p.id} person={p} language={language} />
              ))}
            </div>
          ) : (
            <Empty
              title={t(
                "Aún no hay perfiles de muestra en esta especialidad",
                "No sample professionals in this specialty yet",
              )}
              description={t(
                "Puedes publicar tu solicitud para explorar el flujo de proyectos.",
                "You can post a request to explore the project workflow.",
              )}
            />
          )}
        </Panel>
      </div>
    </>
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
  const update = (key: string, value: string) => {
    const params = new URLSearchParams(route.params);
    value ? params.set(key, value) : params.delete(key);
    if (key === "category") params.delete("subcategory");
    navigate("/professionals", params);
  };
  const results = findProfessionals(state, {
    query: route.params.get("q") || "",
    categoryId: category,
    subcategoryId: subcategory,
    country: route.params.get("country") || "",
    city: route.params.get("city") || "",
    verifiedOnly: verified,
    minimumRating: min,
    usArea: area,
  });
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
          {results.length} {t("perfiles de ejemplo", "sample profiles")}
        </p>
        <Button variant="ghost" onClick={() => navigate("/professionals")}>
          {t("Limpiar filtros", "Clear filters")}
        </Button>
      </div>
      {results.length ? (
        <div className="eco-people-grid directory-grid">
          {results.map((p) => (
            <PersonCard key={p.id} person={p} language={language} />
          ))}
        </div>
      ) : (
        <Empty
          title={t(
            "No hay perfiles de ejemplo con estos filtros.",
            "No sample profiles match these filters.",
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
}: {
  id: string;
  language: Language;
}) {
  const { state, role, send } = useStore();
  const cart = useCart();
  const t = copy(language);
  const person = state.professionals.find(
    (p) => p.id === id && p.publication === "published",
  );
  if (!person) return <Missing language={language} />;
  const favorite = state.favorites.includes(id);
  const socialLinks = socialPlatforms.map(([key, es, en]) => {
    const url = person.socialLinks?.[key];
    return {
      key,
      label: t(es, en),
      url: url && isPublicWebUrl(url) ? url : undefined,
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
            {person.fur} · {t("PERFIL DE DEMOSTRACIÓN", "DEMO PROFILE")}
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
            {role === "owner" && (
              <Button
                variant="outline"
                aria-pressed={favorite}
                onClick={() => send({ type: "favorite", professionalId: id })}
              >
                {favorite ? <PiHeartFill /> : <PiHeart />}
                {favorite ? t("Guardado", "Saved") : t("Guardar", "Save")}
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
                    {work.title[language]} · {t("ilustrativo", "illustrative")}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Panel>
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
                    <Icon aria-hidden="true" />
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
          {role === "owner" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                navigate(
                  "/workspace/owner/messages",
                  new URLSearchParams({ professional: id }),
                )
              }
            >
              {t("Escribir un mensaje", "Send a message")}
            </Button>
          )}
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
