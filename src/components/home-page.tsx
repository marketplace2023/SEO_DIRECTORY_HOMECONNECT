import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscoveryHero } from "./home-discovery-hero";
import { HomeSubcategories } from "./home-subcategories";
import { UsAreaMap } from "@/components/ecosystem/us-area-map";
import { navigate } from "@/lib/navigation";
import {
  PiArrowUpRight,
  PiChatCircleDots,
  PiCompass,
  PiHandshake,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { ProfessionalCard } from "@/components/professional-card";
import type { SearchBarProps } from "@/components/search-bar";
import { categoryIcon } from "@/components/category-icons";
import translations from "@/data/translations.json";
import { categories, categoryName } from "@/data/catalog";
import type { Professional } from "@/domain/types";

export function HomePage({
  search,
  professionals,
  onCategory,
  onProfile,
  onExplore,
  onQuote,
}: {
  search: SearchBarProps;
  professionals: { person: Professional; requests: number }[];
  onCategory: (id: string) => void;
  onProfile: (id: string) => void;
  onExplore: () => void;
  onQuote: () => void;
}) {
  const es = search.language === "es";
  const t = translations[search.language];
  const [family, setFamily] = useState("all");
  const exterior = [
    "roofing",
    "landscaping",
    "trees",
    "fencing",
    "decks",
    "gutters",
    "siding",
    "pools",
    "pressure-washing",
  ];
  const systems = [
    "plumbing",
    "electrical",
    "hvac",
    "solar",
    "appliances",
    "septic",
    "home-automation",
    "home-networks",
    "irrigation",
  ];
  const catalog = categories.filter(
    (c) =>
      family === "all" ||
      (family === "outside"
        ? exterior.includes(c.id)
        : family === "systems"
          ? systems.includes(c.id)
          : !exterior.includes(c.id) && !systems.includes(c.id)),
  );
  const steps = [
    {
      icon: PiCompass,
      title: es ? "Cuéntanos qué imaginas" : "Tell us what you imagine",
      description: es
        ? "Una reparación pendiente o un cambio completo. Todo empieza con tu idea."
        : "A pending repair or a complete transformation. It all starts with your idea.",
    },
    {
      icon: PiChatCircleDots,
      title: es
        ? "Conoce a quien lo hará posible"
        : "Meet the people who can help",
      description: es
        ? "Explora especialidades, experiencia y perfiles. Encuentra tu conexión."
        : "Explore specialties, experience and profiles. Find your connection.",
    },
    {
      icon: PiHandshake,
      title: es ? "Da el siguiente paso" : "Take the next step",
      description: es
        ? "Describe tu proyecto y prepara una solicitud de presupuesto a tu medida."
        : "Describe your project and prepare a quote request that fits.",
    },
  ];
  return (
    <>
      <DiscoveryHero
        search={search}
        onCategory={onCategory}
        onQuote={onQuote}
        showSearch={false}
      />
      <section
        className="categories-section site-container"
        aria-labelledby="category-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {es ? "UN MUNDO DE POSIBILIDADES" : "A WORLD OF POSSIBILITIES"}
            </p>
            <h2 id="category-title">
              {es ? (
                <>
                  ¿Qué tienes <em>en mente?</em>
                </>
              ) : (
                <>
                  What’s <em>on your mind?</em>
                </>
              )}
            </h2>
          </div>
        </div>
        <Tabs value={family} onValueChange={setFamily} className="mb-6">
          <TabsList variant="line" className="max-w-full overflow-x-auto">
            <TabsTrigger value="all">{es ? "Todos" : "All"}</TabsTrigger>
            <TabsTrigger value="outside">
              {es ? "Exterior" : "Outside"}
            </TabsTrigger>
            <TabsTrigger value="inside">
              {es ? "Interior" : "Inside"}
            </TabsTrigger>
            <TabsTrigger value="systems">
              {es ? "Instalaciones" : "Systems"}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="home-category-grid">
          {catalog.map((category) => {
            const Icon = categoryIcon(category.id);
            return (
              <button
                key={category.id}
                className="category-tile"
                onClick={() => onCategory(category.id)}
              >
                <img
                  className="home-category-photo"
                  src={category.image}
                  alt=""
                  loading="lazy"
                  width={160}
                  height={107}
                />
                <Icon className="category-icon" />
                <span>{category.name[search.language]}</span>
                <PiArrowUpRight className="category-arrow" />
              </button>
            );
          })}
        </div>
        <div className="category-footnote">
          <span>
            {es
              ? "Del pequeño arreglo al gran proyecto."
              : "From small repairs to big projects."}
          </span>
          <span>
            <NumberTicker value={categories.length} className="text-inherit" />{" "}
            {es ? "especialidades, un solo lugar" : "specialties, one place"}
          </span>
        </div>
      </section>
      <HomeSubcategories language={search.language} />
      <section
        className="professionals-section"
        aria-labelledby="professionals-title"
      >
        <div className="site-container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {es ? "LOS MÁS SOLICITADOS" : "MOST REQUESTED"}
              </p>
              <h2 id="professionals-title">
                {es
                  ? "Contratistas más cotizados"
                  : "Most requested contractors"}
              </h2>
            </div>
            <div className="section-heading-side">
              <p>
                {es
                  ? "Ordenados por solicitudes de presupuesto recibidas."
                  : "Ranked by quote requests received."}
              </p>
              <button className="text-link" onClick={onExplore}>
                {es ? "Explorar profesionales" : "Explore professionals"}
                <PiArrowUpRight />
              </button>
            </div>
          </div>
          <div className="home-professional-grid">
            {professionals.map(({ person, requests }) => (
              <article className="home-featured-contractor" key={person.id}>
                <ProfessionalCard
                  person={person}
                  category={categoryName(person.categoryId, search.language)}
                  experience={t.experience}
                  details={t.details}
                  verifiedLabel={es ? "Verificado · demo" : "Verified · demo"}
                  onOpen={() => onProfile(person.id)}
                />
                <p className="home-contractor-demand">
                  {requests}{" "}
                  {requests === 1
                    ? es
                      ? "solicitud de presupuesto"
                      : "quote request"
                    : es
                      ? "solicitudes de presupuesto"
                      : "quote requests"}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section
        className="home-map-preview site-container us-home-map"
        aria-labelledby="home-area-title"
      >
        <div className="us-home-map-copy">
          <PiCompass aria-hidden="true" />
          <h2 id="home-area-title">
            {es ? "Explora el mapa de zonas" : "Explore the area map"}
          </h2>
          <p>
            {es
              ? "Encuentra profesionales en Estados Unidos por estado, ciudad o especialidad."
              : "Find professionals in the United States by state, city, or specialty."}
          </p>
          <Button asChild size="lg">
            <a href="#/areas">
              {es ? "Abrir mapa de zonas" : "Open area map"}
              <PiArrowUpRight />
            </a>
          </Button>
        </div>
        <UsAreaMap
          language={search.language}
          getHref={({ state }) => `#/areas?state=${state}`}
        />
      </section>
      <section
        id="how-it-works"
        className="how-section site-container"
        aria-labelledby="how-title"
      >
        <div className="how-image">
          <img
            src="/images/process.jpg"
            alt={
              es
                ? "Diseño arquitectónico y planos para preparar un proyecto"
                : "Architectural design and plans for a project"
            }
            loading="lazy"
          />
          <div className="how-image-caption">
            <span>
              {es
                ? "DE LA IDEA AL SIGUIENTE PASO"
                : "FROM IDEA TO THE NEXT STEP"}
            </span>
            <span>↗</span>
          </div>
        </div>
        <div className="how-content">
          <p className="eyebrow">
            {es
              ? "MENOS VUELTAS. MÁS CONEXIONES."
              : "LESS SEARCHING. MORE CONNECTING."}
          </p>
          <h2 id="how-title">
            {es ? (
              <>
                Hacerlo realidad
                <br />
                <em>empieza fácil.</em>
              </>
            ) : (
              <>
                Making it real
                <br />
                <em>starts simply.</em>
              </>
            )}
          </h2>
          <div className="how-steps">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <BlurFade key={title} inView delay={index * 0.09}>
                <article className="how-step">
                  <span className="step-number">0{index + 1}</span>
                  <div>
                    <h3>
                      {title}
                      <Icon />
                    </h3>
                    <p>{description}</p>
                  </div>
                </article>
              </BlurFade>
            ))}
          </div>
          <button className="text-link" onClick={onQuote}>
            {es ? "Cuéntanos tu proyecto" : "Tell us about your project"}
            <PiArrowUpRight />
          </button>
        </div>
      </section>
      <section className="project-cta site-container">
        <div className="project-cta-inner">
          <GlowingEffect
            spread={40}
            glow
            disabled={false}
            proximity={100}
            inactiveZone={0.01}
            borderWidth={2}
            variant="white"
          />
          <div>
            <p className="eyebrow">
              {es ? "ESO QUE TIENES EN MENTE" : "THAT IDEA ON YOUR MIND"}
            </p>
            <h2>
              {es ? (
                <>
                  Que no se quede
                  <br />
                  en <em>“algún día”.</em>
                </>
              ) : (
                <>
                  Don’t leave it
                  <br />
                  for <em>“someday”.</em>
                </>
              )}
            </h2>
            <p className="cta-description">
              {es
                ? "Dale forma a tu idea. El primer paso es contarnos qué necesitas."
                : "Give your idea shape. The first step is telling us what you need."}
            </p>
            <Button onClick={onQuote} className="cta-button">
              {es ? "Empezar mi proyecto" : "Start my project"}
              <PiArrowUpRight />
            </Button>
          </div>
          <div className="cta-art" aria-hidden="true">
            <span className="cta-orbit orbit-one" />
            <span className="cta-orbit orbit-two" />
            <span className="cta-orbit orbit-three" />
            <PiArrowUpRight />
          </div>
          <span className="cta-bottom-note">
            {es
              ? "BUENAS CONEXIONES. NUEVOS COMIENZOS."
              : "GOOD CONNECTIONS. NEW BEGINNINGS."}
          </span>
        </div>
      </section>
    </>
  );
}
