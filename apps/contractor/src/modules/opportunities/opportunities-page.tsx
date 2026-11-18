import { RequestList, RequestDetail } from "@/components/ecosystem/workflows";
import { useStore } from "@/domain/store";
import type { Language } from "@/domain/types";
export function OpportunitiesPage({
  id,
  language,
}: {
  id?: string;
  language: Language;
}) {
  const { professionalId } = useStore();
  return id ? (
    <RequestDetail
      key={`${id}-${professionalId}`}
      id={id}
      language={language}
      contractor
    />
  ) : (
    <RequestList language={language} contractor />
  );
}
