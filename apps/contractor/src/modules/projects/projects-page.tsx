import { Projects } from "@/components/ecosystem/workflows";
import type { Language } from "@/domain/types";
export function ProjectsPage({
  id,
  language,
}: {
  id?: string;
  language: Language;
}) {
  return <Projects id={id} language={language} contractor />;
}
