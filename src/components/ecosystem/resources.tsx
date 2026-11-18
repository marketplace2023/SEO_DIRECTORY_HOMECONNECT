import { PiArrowLeft, PiArrowUpRight } from "react-icons/pi";
import type { Language, Localized } from "@/domain/types";
import { navigate } from "@/lib/navigation";
import { PageTitle, Panel, copy } from "./primitives";
import { Missing } from "./public-pages";

const guides: {
  id: string;
  title: Localized;
  intro: Localized;
  image: string;
  steps: Localized[];
}[] = [
  {
    id: "planificar",
    title: {
      es: "De una idea a un proyecto claro",
      en: "From an idea to a clear project",
    },
    intro: {
      es: "Un poco de preparación ayuda a que todos entiendan el mismo resultado.",
      en: "A little preparation helps everyone understand the same result.",
    },
    image: "/images/process.jpg",
    steps: [
      {
        es: "Describe el resultado que buscas y qué problema quieres resolver.",
        en: "Describe the result you want and the problem you want to solve.",
      },
      {
        es: "Anota las medidas aproximadas y las condiciones del espacio. No compartas documentos personales para pedir una cotización.",
        en: "Write down approximate dimensions and the condition of the space. Do not share personal documents to request a quote.",
      },
      {
        es: "Distingue lo imprescindible de lo opcional y acuerda un rango de presupuesto.",
        en: "Separate essentials from optional items and agree on a budget range.",
      },
      {
        es: "Confirma si necesitas visita previa, materiales o permisos antes de iniciar.",
        en: "Confirm whether a site visit, materials or permits are needed before starting.",
      },
    ],
  },
  {
    id: "comparar",
    title: {
      es: "Cómo comparar dos propuestas",
      en: "How to compare two proposals",
    },
    intro: {
      es: "El precio es una parte del acuerdo. El alcance y las condiciones importan también.",
      en: "Price is one part of the agreement. Scope and terms matter too.",
    },
    image: "/images/hero.jpg",
    steps: [
      {
        es: "Comprueba que ambas propuestas describan el mismo trabajo.",
        en: "Check that both proposals describe the same work.",
      },
      {
        es: "Revisa materiales incluidos, preparación, retiro de residuos y acabados.",
        en: "Review included materials, preparation, debris removal and finishes.",
      },
      {
        es: "Contrasta el plazo, la disponibilidad y las condiciones de cambios.",
        en: "Compare timeframe, availability and change conditions.",
      },
      {
        es: "En este prototipo, aceptar una propuesta crea un proyecto de demostración; no genera cobros ni contratos reales.",
        en: "In this prototype, accepting a proposal creates a demo project; it does not create charges or real contracts.",
      },
    ],
  },
  {
    id: "credenciales",
    title: {
      es: "Leer una ficha con más contexto",
      en: "Read a profile with more context",
    },
    intro: {
      es: "Una información declarada no es lo mismo que una evidencia revisada.",
      en: "Declared information is different from reviewed evidence.",
    },
    image: "/images/professional-1.jpg",
    steps: [
      {
        es: "La sede indica dónde se encuentra el profesional; la cobertura muestra las ciudades que declara atender.",
        en: "The office shows where a professional is based; coverage lists the cities they declare serving.",
      },
      {
        es: "Las credenciales pueden estar declaradas, en revisión, verificadas en demo o requerir cambios.",
        en: "Credentials can be declared, under review, verified in demo or need changes.",
      },
      {
        es: "Consulta servicios y portafolio para entender su especialidad.",
        en: "Check services and portfolio to understand their specialty.",
      },
      {
        es: "Todos los perfiles de HOME CONNECT son ficticios en esta versión. Los distintivos no representan verificaciones reales.",
        en: "All HOME CONNECT profiles in this version are fictional. Badges do not represent real verifications.",
      },
    ],
  },
];
export function Resources({
  language,
  id,
}: {
  language: Language;
  id?: string;
}) {
  const t = copy(language);
  const guide = guides.find((g) => g.id === id);
  if (id && !guide) return <Missing language={language} />;
  return guide ? (
    <>
      <button className="eco-back" onClick={() => navigate("/resources")}>
        <PiArrowLeft />
        {t("Volver a las guías", "Back to guides")}
      </button>
      <div className="guide-detail">
        <PageTitle
          eyebrow={t("IDEAS PARA EMPEZAR", "IDEAS TO GET STARTED")}
          title={guide.title[language]}
          description={guide.intro[language]}
        />
        <img src={guide.image} alt={guide.title[language]} />
        <Panel title={t("Paso a paso", "Step by step")}>
          <ol className="guide-steps">
            {guide.steps.map((step, i) => (
              <li key={i}>
                <span>0{i + 1}</span>
                <p>{step[language]}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  ) : (
    <>
      <PageTitle
        eyebrow={t("UN POCO DE CONTEXTO", "A LITTLE CONTEXT")}
        title={t("Buenas ideas para empezar.", "Good ideas to get started.")}
        description={t(
          "Guías breves para preparar tu proyecto y explorar el ecosistema.",
          "Short guides to prepare your project and explore the ecosystem.",
        )}
      />
      <div className="guide-grid">
        {guides.map((g) => (
          <button
            key={g.id}
            className="guide-card"
            onClick={() => navigate(`/resources/${g.id}`)}
          >
            <img src={g.image} alt={g.title[language]} />
            <div>
              <h2>{g.title[language]}</h2>
              <p>{g.intro[language]}</p>
              <span className="text-link">
                {t("Leer guía", "Read guide")}
                <PiArrowUpRight />
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
