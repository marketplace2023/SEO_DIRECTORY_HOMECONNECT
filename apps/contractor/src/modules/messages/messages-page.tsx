import { Messages } from "@/components/ecosystem/operations";
import type { Language } from "@/domain/types";
import type { Route } from "@/lib/navigation";
export function MessagesPage({
  route,
  language,
}: {
  route: Route;
  language: Language;
}) {
  return <Messages route={route} language={language} />;
}
