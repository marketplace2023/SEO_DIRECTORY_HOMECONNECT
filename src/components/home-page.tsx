import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscoveryHero } from "./home-discovery-hero";
import { MagicCard } from "@/components/ui/magic-card";
import { useRef, useState } from "react";
import { MapSurface } from "@/components/ecosystem/map-surface";
import { navigate } from "@/lib/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Keyboard, FreeMode } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import {
  PiArrowUpRight,
  PiArrowRight,
  PiArrowLeft,
  PiChatCircleDots,
  PiCompass,
  PiHandshake,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { ProfessionalCard } from "@/components/professional-card";
import { type SearchBarProps } from "@/components/search-bar";
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
  professionals: Professional[];
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
  const categorySlider = useRef<SwiperInstance | null>(null);
  const professionalSlider = useRef<SwiperInstance | null>(null);
  const [categoryEdges, setCategoryEdges] = useState({
    start: true,
    end: false,
  });
  const [professionalEdges, setProfessionalEdges] = useState({
    start: true,
    end: false,
  });
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
          <div className="slider-controls">
            <button
              aria-label={es ? "Categorías anteriores" : "Previous categories"}
              disabled={categoryEdges.start}
              onClick={() => categorySlider.current?.slidePrev()}
            >
              <PiArrowLeft />
            </button>
            <button
              aria-label={es ? "Siguientes categorías" : "Next categories"}
              disabled={categoryEdges.end}
              onClick={() => categorySlider.current?.slideNext()}
            >
              <PiArrowRight />
            </button>
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
        <Swiper
          key={family}
          modules={[A11y, Keyboard, FreeMode]}
          keyboard={{ enabled: true, onlyInViewport: true }}
          freeMode
          slidesPerView={2.15}
          spaceBetween={12}
          breakpoints={{
            540: { slidesPerView: 3.3 },
            800: { slidesPerView: 4.4 },
            1100: { slidesPerView: 6 },
          }}
          onSwiper={(swiper) => {
            categorySlider.current = swiper;
            setCategoryEdges({ start: swiper.isBeginning, end: swiper.isEnd });
          }}
          onSlideChange={(swiper) =>
            setCategoryEdges({ start: swiper.isBeginning, end: swiper.isEnd })
          }
          className="category-swiper"
        >
          {catalog.map((category) => {
            const Icon = categoryIcon(category.id);
            return (
              <SwiperSlide key={category.id}>
                <MagicCard
                  gradientFrom="#e00707"
                  gradientTo="#f5b5a7"
                  gradientColor="#fff1ed"
                  gradientOpacity={0.45}
                  className="rounded-xl"
                >
                  <button
                    className="group/category block w-full p-4 text-left"
                    onClick={() => onCategory(category.id)}
                  >
                    <img
                      className="mb-4 aspect-[3/2] h-auto w-full rounded-lg object-contain transition-transform duration-300 group-hover/category:scale-105"
                      src={category.illustration}
                      alt=""
                      loading="lazy"
                      width={160}
                      height={107}
                    />
                    <Icon className="mb-3 size-5 text-primary" />
                    <span className="block text-sm font-bold">
                      {category.name[search.language]}
                    </span>
                    <span className="mt-2 flex justify-between text-xs text-neutral-500">
                      {es ? "Conoce su alcance" : "Understand the scope"}
                      <PiArrowUpRight />
                    </span>
                  </button>
                </MagicCard>
              </SwiperSlide>
            );
          })}
        </Swiper>
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
      <section
        className="professionals-section"
        aria-labelledby="professionals-title"
      >
        <div className="site-container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {es ? "CONOCE EL TALENTO" : "MEET THE TALENT"}
              </p>
              <h2 id="professionals-title">
                {es ? (
                  <>
                    Gente que sabe
                    <br />
                    <em>hacer que pase.</em>
                  </>
                ) : (
                  <>
                    People who know
                    <br />
                    <em>how to make it happen.</em>
                  </>
                )}
              </h2>
            </div>
            <div className="section-heading-side">
              <p>
                {es
                  ? "Descubre a los profesionales detrás de tu próximo proyecto."
                  : "Discover the professionals behind your next project."}
              </p>
              <button className="text-link" onClick={onExplore}>
                {es ? "Explorar profesionales" : "Explore professionals"}
                <PiArrowUpRight />
              </button>
            </div>
          </div>
          <Swiper
            modules={[A11y, Keyboard]}
            keyboard={{ enabled: true, onlyInViewport: true }}
            slidesPerView={1.12}
            spaceBetween={24}
            breakpoints={{
              600: { slidesPerView: 1.8 },
              900: { slidesPerView: 2.6 },
              1200: { slidesPerView: 3.2 },
            }}
            onSwiper={(swiper) => {
              professionalSlider.current = swiper;
              setProfessionalEdges({
                start: swiper.isBeginning,
                end: swiper.isEnd,
              });
            }}
            onSlideChange={(swiper) =>
              setProfessionalEdges({
                start: swiper.isBeginning,
                end: swiper.isEnd,
              })
            }
            className="professional-swiper"
          >
            {professionals.map((person) => (
              <SwiperSlide key={person.name}>
                <ProfessionalCard
                  person={person}
                  category={categoryName(person.categoryId, search.language)}
                  experience={t.experience}
                  details={t.details}
                  verifiedLabel={es ? "Verificado · demo" : "Verified · demo"}
                  onOpen={() => onProfile(person.id)}
                />
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="professional-bottom">
            <p>
              {es
                ? "Una selección de perfiles para explorar el prototipo."
                : "A selection of profiles to explore the prototype."}
            </p>
            <div className="slider-controls">
              <button
                aria-label={
                  es ? "Profesionales anteriores" : "Previous professionals"
                }
                disabled={professionalEdges.start}
                onClick={() => professionalSlider.current?.slidePrev()}
              >
                <PiArrowLeft />
              </button>
              <button
                aria-label={
                  es ? "Siguientes profesionales" : "Next professionals"
                }
                disabled={professionalEdges.end}
                onClick={() => professionalSlider.current?.slideNext()}
              >
                <PiArrowRight />
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="home-map-preview site-container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {es ? "CONECTA POR UBICACION" : "CONNECT BY LOCATION"}
            </p>
            <h2>
              {es ? "Encuentra talento en el mapa." : "Find talent on the map."}
            </h2>
          </div>
          <Button variant="outline" onClick={() => navigate("/coverage")}>
            {es ? "Abrir mapa completo" : "Open full map"}
            <PiArrowUpRight />
          </Button>
        </div>
        <MapSurface language={search.language} compact />
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
