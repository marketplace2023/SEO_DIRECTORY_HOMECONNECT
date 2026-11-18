import type { ReactNode } from "react";
import { PiArrowUpRight, PiFolderOpen } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import {
  evidenceNames,
  type Language,
  type EvidenceState,
} from "@/domain/types";

export const copy = (language: Language) => (es: string, en: string) =>
  language === "es" ? es : en;
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="eco-page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="eco-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="eco-empty">
      <PiFolderOpen aria-hidden="true" />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="eco-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
export function EvidenceBadge({
  status,
  language,
}: {
  status: EvidenceState;
  language: Language;
}) {
  return (
    <span className={`eco-badge ${status}`}>
      {evidenceNames[status][language]}
    </span>
  );
}
export function ActionLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" className="eco-action-link" onClick={onClick}>
      {children}
      <PiArrowUpRight />
    </Button>
  );
}
export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="eco-panel">
      <div className="eco-panel-title">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
