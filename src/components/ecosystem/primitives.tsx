import { isValidElement, type ReactNode, type ComponentProps } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Empty as EmptyBase,
  EmptyHeader,
  EmptyMedia,
  EmptyDescription,
} from "@/components/ui/empty";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
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
      <Label asChild>
        <span>{label}</span>
      </Label>
      {isValidElement(children) && children.type === "select" ? (
        <NativeSelect
          {...(children.props as ComponentProps<"select">)}
          size="default"
        />
      ) : (
        children
      )}
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
    <EmptyBase className="eco-empty rounded-xl border-dashed p-8!">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PiFolderOpen aria-hidden="true" />
        </EmptyMedia>
        <h2>{title}</h2>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children}
    </EmptyBase>
  );
}
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <MagicCard
      gradientFrom="var(--primary)"
      gradientTo="#ff8010"
      gradientColor="#fff2e5"
      gradientOpacity={0.4}
      className="eco-stat rounded-xl p-0!"
    >
      <div className="space-y-4 p-5">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <strong className="block font-sans text-3xl font-bold tracking-tight tabular-nums">
          {typeof value === "number" ? (
            <NumberTicker value={value} className="text-inherit" />
          ) : (
            value
          )}
        </strong>
        <div className="h-0.5 w-8 bg-primary/70" aria-hidden="true" />
      </div>
    </MagicCard>
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
    <Badge variant="outline" className={`eco-badge ${status}`}>
      {evidenceNames[status][language]}
    </Badge>
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
    <Card className="eco-panel gap-0 rounded-xl! p-0! shadow-none">
      <CardHeader className="eco-panel-title mb-0! flex items-center justify-between gap-4 border-b border-neutral-100 px-6 py-5">
        <CardTitle>
          <h2 className="text-base! tracking-tight">{title}</h2>
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}
