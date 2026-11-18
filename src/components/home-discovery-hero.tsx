import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Keyboard, EffectFade, Pagination } from "swiper/modules";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import { PiMapPin, PiArrowUpRight } from "react-icons/pi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SearchBar, type SearchBarProps } from "@/components/search-bar";
import { categories } from "@/data/catalog";
import { navigate } from "@/lib/navigation";

export function DiscoveryHero({
  search,
  onCategory,
  onQuote,
}: {
  search: SearchBarProps;
  onCategory: (id: string) => void;
  onQuote: () => void;
}) {
  const es = search.language === "es";
  const projects = [
    {
      image: "/images/hero.jpg",
      category: "remodeling",
      title: es ? "Un espacio para vivirlo." : "A space to live in.",
      caption: es
        ? "Remodelación y diseño interior"
        : "Remodeling and interior design",
    },
    {
      image: "/images/process.jpg",
      category: "general-contractors",
      title: es
        ? "Cada detalle empieza con un plan."
        : "Every detail starts with a plan.",
      caption: es
        ? "Planificación y oficios especializados"
        : "Planning and specialized trades",
    },
  ];
  return (
    <section
      className="site-container pt-6 pb-10 md:pt-10 md:pb-16"
      aria-labelledby="hero-title"
      data-design-system="homeconnect-v2"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[.95fr_1.05fr] lg:gap-14">
        <div className="min-w-0 py-4 md:py-8">
          <BlurFade delay={0.05}>
            <Badge
              variant="outline"
              className="mb-7 gap-2 rounded-md border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700"
            >
              <PiMapPin />
              Georgia · {es ? "Servicios del hogar" : "Home services"}
            </Badge>
          </BlurFade>
          <BlurFade delay={0.12}>
            <h1
              id="hero-title"
              className="text-[clamp(2.8rem,5.4vw,5.2rem)] leading-[1.03] font-bold tracking-[-.065em] text-balance"
            >
              {es ? "Grandes ideas." : "Big ideas."}
              <br />
              <span className="text-primary">
                {es ? "Las manos correctas." : "The right hands."}
              </span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.2}>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-neutral-600">
              {es
                ? "Tu casa tiene un próximo capítulo. Encuentra a los profesionales de tu zona para empezar a escribirlo."
                : "Your home has a next chapter. Find the local professionals to help you write it."}
            </p>
          </BlurFade>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <InteractiveHoverButton
              onClick={onQuote}
              className="rounded-lg py-3 text-sm"
            >
              {es ? "Cuéntanos tu proyecto" : "Tell us about your project"}
            </InteractiveHoverButton>
            <Button
              variant="link"
              onClick={() => navigate("/coverage")}
              className="px-0 text-sm text-neutral-700"
            >
              <PiMapPin />
              {es ? "Explorar el mapa" : "Explore the map"}
            </Button>
          </div>
          <div className="mt-9 flex gap-7 border-t border-neutral-200 pt-5 text-xs text-neutral-500">
            <span>
              <NumberTicker
                value={categories.length}
                className="mr-1 text-lg font-bold text-neutral-900"
              />
              {es ? "especialidades" : "trades"}
            </span>
            <span className="max-w-40 leading-5">
              {es
                ? "Oficios explicados. Cobertura declarada. Decisiones con contexto."
                : "Explained trades. Declared coverage. Informed decisions."}
            </span>
          </div>
        </div>
        <div className="relative min-w-0">
          <Swiper
            modules={[EffectFade, Pagination, Keyboard, A11y]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            pagination={{ clickable: true }}
            keyboard={{ enabled: true, onlyInViewport: true }}
            className="overflow-hidden rounded-xl [--swiper-pagination-color:#e00707]"
            aria-label={es ? "Inspiración para tu hogar" : "Home inspiration"}
          >
            {projects.map((project) => (
              <SwiperSlide key={project.category}>
                <DirectionAwareHover
                  imageUrl={project.image}
                  alt={project.caption}
                  className="h-[360px]! w-full! rounded-xl md:h-[510px]!"
                  childrenClassName="opacity-100! left-6! right-6 bottom-12! text-white"
                  imageClassName="scale-100!"
                >
                  <div
                    className="pointer-events-none absolute -inset-8 -z-10 bg-black/30 blur-xl"
                    aria-hidden="true"
                  />
                  <p className="mb-2 text-[10px] font-semibold tracking-[.15em] uppercase">
                    {project.caption}
                  </p>
                  <h2 className="max-w-xs text-3xl leading-tight font-semibold tracking-tight">
                    {project.title}
                  </h2>
                  <Button
                    onClick={() => onCategory(project.category)}
                    variant="outline"
                    className="mt-4 border-white/40 bg-white/95 text-neutral-900 hover:bg-white"
                  >
                    {es ? "Explorar especialidad" : "Explore trade"}
                    <PiArrowUpRight />
                  </Button>
                </DirectionAwareHover>
              </SwiperSlide>
            ))}
          </Swiper>
          <Badge className="absolute top-5 left-5 z-10 rounded-md bg-white/95 px-3 py-1.5 text-[10px] tracking-wide text-neutral-800 shadow-none">
            {es
              ? "Ideas para tu próximo proyecto"
              : "Ideas for your next project"}
          </Badge>
        </div>
      </div>
      <div className="mt-7">
        <SearchBar {...search} />
      </div>
    </section>
  );
}
